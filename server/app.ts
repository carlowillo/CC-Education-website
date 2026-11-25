import express from 'express';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {root,loadInitiatives,loadRetainedCoverage,withInitiativeNames,type RetainedCoverage} from './data.js';
import {loadCoverageTransport} from './coverage-transport.js';
import {eligible, londonToISO} from './logic.js';
import {applyLocations,resolvePostcodes} from './geocoding.js';
import {requestTravelArea,type TravelMode} from './routing.js';
import type {Initiative, Coverage} from '../src/types.js';
import {passwordGate} from './auth.js';
import {isPrecise} from '../src/locations.js';

export const host=process.env.HOST||'127.0.0.1';
export async function createApp(options:{serverless?:boolean}={}){
const serverless=options.serverless??Boolean(process.env.VERCEL);
const coverageBatchSize=serverless?1:5;
const password=process.env.ADMIN_PASSWORD||'';
if((serverless||!['127.0.0.1','localhost','::1'].includes(host))&&password.length<16){
  throw new Error('External hosting requires ADMIN_PASSWORD with at least 16 characters.');
}

const cacheDir=serverless?path.join(tmpdir(),'cc-education-reach'):path.join(root,'.cache');
await mkdir(cacheDir,{recursive:true});
const rows=await loadInitiatives(cacheDir);
const retained:RetainedCoverage=serverless?{features:[],arrivalLondon:null}:await loadRetainedCoverage(rows);
const transport=serverless?await loadCoverageTransport(path.join(root,'server-artifacts')):null;
const app = express();
app.disable('x-powered-by');
app.get('/healthz',(_req,res)=>res.json({status:'ok'}));
app.use((_req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','same-origin');next();});
if(password){
  app.use(passwordGate(process.env.ADMIN_USERNAME||'viewer',password));
  app.use((_req,res,next)=>{res.set('Cache-Control','private, no-store');next();});
}
app.use('/api',(req,res,next)=>{
  if(req.method==='POST'){
    if(!req.is('application/json'))return res.status(415).json({error:'JSON requests are required.'});
    const origin=req.get('origin');
    if(origin){
      try{if(new URL(origin).host!==req.get('host'))return res.status(403).json({error:'Cross-origin requests are not allowed.'});}
      catch{return res.status(403).json({error:'Invalid request origin.'});}
    }
  }
  next();
});
app.use(express.json({limit:'20kb'}));
app.use('/api', (_req,res,next)=>{res.set('Cache-Control','no-store');next();});
const routingReady = () => Boolean(process.env.TRAVELTIME_APP_ID && process.env.TRAVELTIME_API_KEY);
app.get('/api/status', (_req,res)=>res.json({routingReady:routingReady(),provider:'TravelTime',serverless,coverageBatchSize,precise:rows.filter(isPrecise).length,estimated:rows.filter(r=>r.location?.precision==='estimated').length,total:rows.length}));
app.get('/api/initiatives', (_req,res)=>res.json(rows));
app.get('/api/coverage-saved',(_req,res)=>res.json(transport?.manifest||retained));
app.get('/api/coverage-saved/chunks/:index',(req,res)=>{
 const index=String(req.params.index);
 const chunk=/^(0|[1-9]\d*)$/.test(index)?transport?.chunk(Number(index)):null;
 if(!chunk)return res.status(404).json({error:'Saved coverage chunk not found.'});
 res.type('application/octet-stream').send(chunk);
});
app.get('/api/coverage-sample',async(_req,res)=>{
  try{const collection=JSON.parse(await readFile(path.join(root,'data/coverage-sample.geojson'),'utf8'));const report=JSON.parse(await readFile(path.join(root,'reports/routing-validation.json'),'utf8'));res.json({...collection,features:withInitiativeNames(collection.features,rows),arrivalLondon:report.arrivalLondon,validatedAt:report.validatedAt});}
  catch{res.json({features:[],arrivalLondon:null});}
});
app.get('/api/places',async(_req,res)=>res.type('json').send(await readFile(path.join(root,'data/places.json'),'utf8')));
app.get('/api/basemap', async (_req,res)=>res.type('json').send(await readFile(path.join(root,'data/basemap.json'),'utf8')));
app.post('/api/geocode', async (_req,res)=>{
  try {
    const pending = rows.filter(r=>r.fullPostcode && !eligible(r));
    if (!pending.length) return res.json({resolved:0,remaining:0,rows});
    const snapshot=await resolvePostcodes(pending);
    applyLocations(rows,snapshot);
    const resolved=pending.filter(r=>eligible(r)).length;
    await writeFile(path.join(cacheDir,'locations.json'),JSON.stringify(Object.fromEntries(rows.filter(r=>eligible(r)).map(r=>[r.id,r.location]))));
    res.json({resolved,remaining:rows.filter(r=>r.fullPostcode&&!eligible(r)).length,rows});
  } catch {res.status(502).json({error:'Precise geocoding is unavailable. Allow api.postcodes.io in environment network settings, then retry. Approximate district pins are preserved.'});}
});
app.get('/api/postcode/:postcode',async(req,res)=>{
  const pc=String(req.params.postcode).trim().toUpperCase();
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(pc)) return res.status(400).json({error:'Enter a full UK postcode, for example SW1A 1AA.'});
  try {
    const response=await fetch('https://api.postcodes.io/postcodes/'+encodeURIComponent(pc),{signal:AbortSignal.timeout(15000)});
    if(response.status===404) return res.status(404).json({error:'Postcode not found. Check the postcode and try again.'});
    if(!response.ok) throw new Error();
    const {result}=await response.json();res.json({lat:result.latitude,lng:result.longitude,postcode:result.postcode});
  }catch{res.status(502).json({error:'Postcode search is unavailable. Check access to api.postcodes.io and retry.'});}
});
let routingBusy=false;
app.post('/api/coverage',async(req,res)=>{
  if(!routingReady())return res.status(503).json({error:'Add TRAVELTIME_APP_ID and TRAVELTIME_API_KEY on the server to calculate genuine journey coverage.'});
  if(routingBusy)return res.status(429).json({error:'A coverage calculation is already running. Try again when it finishes.'});
  const {ids,mode,arrival,includePlanned,includeEstimated}=req.body;
  if(!Array.isArray(ids)||ids.length<1||ids.length>coverageBatchSize||ids.some(id=>typeof id!=='string')||!['driving','public_transport'].includes(mode)||typeof arrival!=='string')return res.status(400).json({error:`Invalid coverage request (maximum ${coverageBatchSize} initiative(s) per batch).`});
  let iso:string;
  try{iso=londonToISO(arrival);}catch(e){return res.status(400).json({error:(e as Error).message});}
  if(Date.parse(iso)<=Date.now())return res.status(400).json({error:'Choose a future arrival time.'});
  const selected=rows.filter(r=>ids.includes(r.id));
  if(selected.length!==new Set(ids).size||selected.some(r=>!eligible(r,includeEstimated===true)||(r.stage!=='Open'&&includePlanned!==true)))return res.status(400).json({error:'Coverage requires resolved full postcodes, or explicit inclusion of estimated locations. Planned initiatives must be explicitly included.'});
  routingBusy=true;
  const features:Coverage[]=[];const errors:{id:string;error:string}[]=[];
  try {
    for(const r of selected){
      const key=createHash('sha256').update(JSON.stringify([r.id,r.location,mode,iso,45])).digest('hex');
      const file=path.join(cacheDir,key+'.json');
      const input=retained.sourceInputs?.find(v=>v.id===r.id);
      const saved=input?.lat===r.location?.lat&&input?.lng===r.location?.lng?retained.features.find(f=>f.properties.id===r.id&&f.properties.mode===mode&&f.properties.arrival===iso):undefined;
      if(saved){features.push(saved);continue;}
      try{features.push(...withInitiativeNames([JSON.parse(await readFile(file,'utf8'))],rows));continue;}catch{}
      try{
        const feature=await requestTravelArea(r,mode as TravelMode,iso);features.push(feature);await writeFile(file,JSON.stringify(feature));
      }catch(error){errors.push({id:r.id,error:(error as Error).message});break;}
    }
    res.json({features,errors});
  }finally{routingBusy=false;}
});
return app;
}
