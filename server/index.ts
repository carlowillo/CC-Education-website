import express from 'express';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {eligible, londonToISO} from './logic.ts';
import {applyLocations,postcodeKey,resolvePostcodes,type LocationSnapshot} from './geocoding.ts';
import {requestTravelArea,type TravelMode} from './routing.ts';
import type {Initiative, Coverage} from '../src/types.ts';
import {passwordGate} from './auth.ts';

const host=process.env.HOST||'127.0.0.1';
const password=process.env.ADMIN_PASSWORD||'';
if(!['127.0.0.1','localhost','::1'].includes(host)&&password.length<16){
  throw new Error('External hosting requires ADMIN_PASSWORD with at least 16 characters.');
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root,'.cache');
await mkdir(cacheDir,{recursive:true});
const rows: Initiative[] = JSON.parse(await readFile(path.join(root,'data/initiatives.json'),'utf8'));
try{applyLocations(rows,JSON.parse(await readFile(path.join(root,'data/locations.json'),'utf8')));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
try {
  const cached = JSON.parse(await readFile(path.join(cacheDir,'locations.json'),'utf8'));
  for (const r of rows) if (r.fullPostcode && cached[r.id]?.precision==='postcode' && postcodeKey(cached[r.id].label)===postcodeKey(r.postcode)) r.location = cached[r.id];
} catch { /* Optional local geocoding cache. */ }
// Retained coverage is reused only when its input coordinates still match.
let retained: {features:Coverage[];arrivalLondon:string|null;calculatedAt?:string;scope?:string;combined?:unknown[];sourceInputs?:{id:string;lat:number;lng:number}[]}={features:[],arrivalLondon:null};
try{
 const collection=JSON.parse(await readFile(path.join(root,'data/coverage-open.geojson'),'utf8'));
 const report=JSON.parse(await readFile(path.join(root,'reports/coverage-open.json'),'utf8'));
 const features:Coverage[]=collection.features.filter((f:Coverage)=>{const row=rows.find(r=>r.id===f.properties.id);const input=report.sourceInputs.find((r:{id:string})=>r.id===row?.id);return row?.stage==='Open'&&row.location?.lat===input?.lat&&row.location?.lng===input?.lng;});
 let combined:unknown[]=[];
 if(features.length===collection.features.length){try{combined=JSON.parse(await readFile(path.join(root,'data/coverage-combined.geojson'),'utf8')).features;}catch{}}
 retained={features,arrivalLondon:report.arrivalLondon,calculatedAt:report.calculatedAt,scope:'open',combined,sourceInputs:report.sourceInputs};
}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
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
app.get('/api/status', (_req,res)=>res.json({routingReady:routingReady(),provider:'TravelTime',precise:rows.filter(eligible).length,total:rows.length}));
app.get('/api/initiatives', (_req,res)=>res.json(rows));
app.get('/api/coverage-saved',(_req,res)=>res.json(retained));
app.get('/api/coverage-sample',async(_req,res)=>{
  try{const collection=JSON.parse(await readFile(path.join(root,'data/coverage-sample.geojson'),'utf8'));const report=JSON.parse(await readFile(path.join(root,'reports/routing-validation.json'),'utf8'));res.json({...collection,arrivalLondon:report.arrivalLondon,validatedAt:report.validatedAt});}
  catch{res.json({features:[],arrivalLondon:null});}
});
app.get('/api/basemap', async (_req,res)=>res.type('json').send(await readFile(path.join(root,'data/basemap.json'),'utf8')));
app.post('/api/geocode', async (_req,res)=>{
  try {
    const pending = rows.filter(r=>r.fullPostcode && !eligible(r));
    if (!pending.length) return res.json({resolved:0,remaining:0,rows});
    const snapshot=await resolvePostcodes(pending);
    applyLocations(rows,snapshot);
    const resolved=pending.filter(eligible).length;
    await writeFile(path.join(cacheDir,'locations.json'),JSON.stringify(Object.fromEntries(rows.filter(eligible).map(r=>[r.id,r.location]))));
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
  const {ids,mode,arrival,includePlanned}=req.body;
  if(!Array.isArray(ids)||ids.length<1||ids.length>5||ids.some(id=>typeof id!=='string')||!['driving','public_transport'].includes(mode)||typeof arrival!=='string')return res.status(400).json({error:'Invalid coverage request (maximum five initiatives per batch).'});
  let iso:string;
  try{iso=londonToISO(arrival);}catch(e){return res.status(400).json({error:(e as Error).message});}
  if(Date.parse(iso)<=Date.now())return res.status(400).json({error:'Choose a future arrival time.'});
  const selected=rows.filter(r=>ids.includes(r.id));
  if(selected.length!==new Set(ids).size||selected.some(r=>!eligible(r)||(r.stage!=='Open'&&includePlanned!==true)))return res.status(400).json({error:'Coverage requires precise full postcodes. Planned initiatives must be explicitly included.'});
  routingBusy=true;
  const features:Coverage[]=[];const errors:{id:string;error:string}[]=[];
  try {
    for(const r of selected){
      const key=createHash('sha256').update(JSON.stringify([r.id,r.location,mode,iso,45])).digest('hex');
      const file=path.join(cacheDir,key+'.json');
      const input=retained.sourceInputs?.find(v=>v.id===r.id);
      const saved=input?.lat===r.location?.lat&&input?.lng===r.location?.lng?retained.features.find(f=>f.properties.id===r.id&&f.properties.mode===mode&&f.properties.arrival===iso):undefined;
      if(saved){features.push(saved);continue;}
      try{features.push(JSON.parse(await readFile(file,'utf8')));continue;}catch{}
      try{
        const feature=await requestTravelArea(r,mode as TravelMode,iso);features.push(feature);await writeFile(file,JSON.stringify(feature));
      }catch(error){errors.push({id:r.id,error:(error as Error).message});break;}
    }
    res.json({features,errors});
  }finally{routingBusy=false;}
});
if(process.env.NODE_ENV==='production'){
  app.use(express.static(path.join(root,'dist')));
  app.get('/{*path}',(_req,res)=>res.sendFile(path.join(root,'dist/index.html')));
}else{
  const {createServer}=await import('vite');
  const vite=await createServer({root,server:{middlewareMode:true},appType:'spa'});
  app.use(vite.middlewares);
}
const port=Number(process.env.PORT||3000);
app.listen(port,host,()=>console.log(`Education Reach running on port ${port}`)).on('error',()=>{console.error('Could not start the server. Check that the port is available and permitted.');process.exit(1);});
