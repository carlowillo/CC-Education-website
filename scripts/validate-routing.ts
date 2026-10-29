import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {applyLocations,type LocationSnapshot} from '../server/geocoding.ts';
import {londonToISO} from '../server/logic.ts';
import {requestTravelArea,RoutingError,type TravelMode} from '../server/routing.ts';
import type {Initiative,Coverage} from '../src/types.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rows:Initiative[]=JSON.parse(await readFile(path.join(root,'data/initiatives.json'),'utf8'));
const locations:LocationSnapshot=JSON.parse(await readFile(path.join(root,'data/locations.json'),'utf8'));applyLocations(rows,locations);
const wall=process.argv[2]||'2026-10-30T08:30';
const arrival=londonToISO(wall);
if(Date.parse(arrival)<=Date.now())throw new Error('Pass a future London arrival time, for example YYYY-MM-DDT08:30');
const sample=['9','23','32'].map(id=>rows.find(r=>r.id===id)!);
if(sample.some(r=>r.stage!=='Open'))throw new Error('Validation sample must contain open initiatives');
const features:Coverage[]=[];
const checks:{id:string;postcode:string;mode:TravelMode;outcome:string;httpStatus?:number|null;providerCode?:number|null;detail?:string}[]=[];
let blocked=false;
for(const mode of ['driving','public_transport'] as TravelMode[]){
 for(const row of sample){
  if(blocked)break;
  try{
   const f=await requestTravelArea(row,mode,arrival);features.push(f);
   checks.push({id:row.id,postcode:row.postcode,mode,outcome:'passed'});
   console.log(`${row.name} ${mode}: genuine provider area received (${f.geometry.coordinates.length} polygon parts)`);
  }catch(error){
   const e=error as RoutingError;
   checks.push({id:row.id,postcode:row.postcode,mode,outcome:'failed',httpStatus:e.status??null,providerCode:e.providerCode??null,detail:e.message});
   console.log(`${row.name} ${mode}: ${e.message}${e.status?` (HTTP ${e.status})`:''}`);
   // Authentication/network/quota failures affect the whole run. Avoid repeated requests.
   if(!e.status||[401,403,429].includes(e.status))blocked=true;
  }
 }
}
await mkdir(path.join(root,'reports'),{recursive:true});
const report={validatedAt:new Date().toISOString(),provider:'TravelTime',arrivalLondon:wall,arrivalUTC:arrival,minutes:45,direction:'arrival',sample:sample.map(r=>({id:r.id,name:r.name,postcode:r.postcode,lat:r.location!.lat,lng:r.location!.lng,siteEntranceVerified:false})),expectedAreas:6,receivedAreas:features.length,checks,blocked,notes:['Sample site postcodes resolved against Postcodes.io; actual school entrances have not been independently confirmed.','Only genuine provider responses are included; no radius approximations or fixtures.']};
await writeFile(path.join(root,'reports/routing-validation.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(path.join(root,'data/coverage-sample.geojson'),JSON.stringify({type:'FeatureCollection',features},null,2)+'\n');
console.log(JSON.stringify({receivedAreas:features.length,expectedAreas:6,blocked,report:'reports/routing-validation.json'}));
if(features.length!==6)process.exitCode=1;
