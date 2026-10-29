import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyLocations} from '../server/geocoding.ts';
import {eligible,londonToISO} from '../server/logic.ts';
import {requestTravelArea,RoutingError,type TravelMode} from '../server/routing.ts';
import type {Initiative,Coverage} from '../src/types.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rows:Initiative[]=applyLocations(JSON.parse(await readFile(path.join(root,'data/initiatives.json'),'utf8')),JSON.parse(await readFile(path.join(root,'data/locations.json'),'utf8')));
const arrivalLondon=process.argv[2]||'2026-10-30T08:30';const arrivalUTC=londonToISO(arrivalLondon);
const selected=rows.filter(r=>r.stage==='Open'&&eligible(r));
const sample:Coverage[]=JSON.parse(await readFile(path.join(root,'data/coverage-sample.geojson'),'utf8')).features;
const sampleReport=JSON.parse(await readFile(path.join(root,'reports/routing-validation.json'),'utf8'));
const folder=path.join(root,'.cache','coverage-open',arrivalUTC.replace(/[:.]/g,'-'));await mkdir(folder,{recursive:true});
const features:Coverage[]=[];const failures:{id:string;mode:string;status:number|null;detail:string}[]=[];
let requests=0,reused=0,blocked=false;
for(const mode of ['driving','public_transport'] as TravelMode[]){
 for(const row of selected){
  if(blocked)break;
  const file=path.join(folder,`${row.id}-${mode}.json`);
  const matches=(f:Coverage)=>f.properties.id===row.id&&f.properties.mode===mode&&f.properties.arrival===arrivalUTC;
  let feature:Coverage|undefined;
  try{const entry=JSON.parse(await readFile(file,'utf8'));if(entry.lat===row.location!.lat&&entry.lng===row.location!.lng&&matches(entry.feature))feature=entry.feature;}catch{}
  if(!feature){const input=sampleReport.sample.find((s:{id:string})=>s.id===row.id);if(input?.lat===row.location!.lat&&input?.lng===row.location!.lng)feature=sample.find(matches);}
  if(feature){features.push(feature);reused++;console.log(`${features.length}/140 ${row.name} ${mode}: reused`);continue;}
  if(Date.parse(arrivalUTC)<=Date.now())throw new Error('A future arrival date is required for new provider requests. Existing snapshots remain unchanged.');
  try{
   requests++;feature=await requestTravelArea(row,mode,arrivalUTC);
   await writeFile(file+'.tmp',JSON.stringify({lat:row.location!.lat,lng:row.location!.lng,feature}));await rename(file+'.tmp',file);
   features.push(feature);console.log(`${features.length}/140 ${row.name} ${mode}: received`);
  }catch(error){const e=error as RoutingError;failures.push({id:row.id,mode,status:e.status??null,detail:e.message});console.log(`${row.name} ${mode}: ${e.message}`);if(!e.status||[401,403,429].includes(e.status))blocked=true;}
  // Stay below 60 provider requests/minute. Completed requests are checkpointed.
  await new Promise(resolve=>setTimeout(resolve,1100));
 }
}
const report={version:1,provider:'TravelTime',calculatedAt:new Date().toISOString(),arrivalLondon,arrivalUTC,minutes:45,direction:'arrival',openInitiatives:rows.filter(r=>r.stage==='Open').length,eligibleCount:selected.length,expectedAreas:selected.length*2,receivedAreas:features.length,requests,reused,blocked,sourceInputs:selected.map(r=>({id:r.id,postcode:r.postcode,lat:r.location!.lat,lng:r.location!.lng})),counts:Object.fromEntries(['driving','public_transport'].map(m=>[m,features.filter(f=>f.properties.mode===m).length])),failures,excludedOpen:rows.filter(r=>r.stage==='Open'&&!eligible(r)).map(r=>({id:r.id,name:r.name,postcode:r.postcode,reason:'Full site postcode required'}))};
await writeFile(path.join(root,'data/coverage-open.geojson')+'.tmp',JSON.stringify({type:'FeatureCollection',features}));await rename(path.join(root,'data/coverage-open.geojson')+'.tmp',path.join(root,'data/coverage-open.geojson'));
await writeFile(path.join(root,'reports/coverage-open.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({received:features.length,expected:report.expectedAreas,counts:report.counts,excludedOpen:report.excludedOpen.length,failures,requests,reused}));
if(features.length!==report.expectedAreas)process.exitCode=1;
