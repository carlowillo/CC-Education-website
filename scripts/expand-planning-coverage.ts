import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {applyLocations} from '../server/geocoding.ts';
import {applyEstimatedLocations,canRoute} from '../src/locations.ts';
import {londonToISO} from '../server/logic.ts';
import {requestTravelAreas,requestTravelArea,type TravelMode} from '../server/routing.ts';
import {stageGroup,type Initiative,type Coverage} from '../src/types.ts';
const rows:Initiative[]=applyEstimatedLocations(applyLocations(JSON.parse(await readFile('data/initiatives.json','utf8')),JSON.parse(await readFile('data/locations.json','utf8'))),JSON.parse(await readFile('data/estimated-locations.json','utf8')));
const arrivalLondon=process.argv[2]||'2026-11-23T08:30',arrivalUTC=londonToISO(arrivalLondon);
const selected=rows.filter(r=>canRoute(r,true));
const folder='.cache/coverage-planning/'+arrivalUTC.replace(/[:.]/g,'-');await mkdir(folder,{recursive:true});
const features:Coverage[]=[],failures:{id:string;mode:string;error:string}[]=[];let requests=0,reused=0;
const save=async(row:Initiative,mode:TravelMode,feature:Coverage)=>{const file=`${folder}/${row.id}-${mode}.json`;await writeFile(file+'.tmp',JSON.stringify({lat:row.location!.lat,lng:row.location!.lng,feature}));await rename(file+'.tmp',file);features.push(feature);};
for(const mode of ['driving','public_transport'] as TravelMode[]){
 const pending:Initiative[]=[];
 for(const row of selected){
  try{const entry=JSON.parse(await readFile(`${folder}/${row.id}-${mode}.json`,'utf8')),p=entry.feature.properties;if(entry.lat===row.location!.lat&&entry.lng===row.location!.lng&&p.id===row.id&&p.mode===mode&&p.minutes===45&&p.arrival===arrivalUTC&&p.stageGroup===stageGroup(row.stage)&&p.routingPostcode===row.location!.label&&p.locationBasis===(row.location!.precision==='estimated'?'estimated':'postcode')){features.push(entry.feature);reused++;continue;}}catch{}
  pending.push(row);
 }
 for(let i=0;i<pending.length;i+=5){
  if(Date.parse(arrivalUTC)<=Date.now())throw new Error('New routing requests require a future arrival time.');
  const batch=pending.slice(i,i+5);
  try{
   requests++;const result=await requestTravelAreas(batch,mode,arrivalUTC);
   for(const row of batch)await save(row,mode,result.find(f=>f.properties.id===row.id)!);
   console.log(`${features.length}/${selected.length*2} areas saved (${mode})`);
  }catch(error){
   const status=(error as {status?:number|null}).status;if(status===undefined||status===null||[401,403,429].includes(status))throw error;
   // A location unsupported in this mode must not discard successful neighbours.
   for(const row of batch){try{requests++;await save(row,mode,await requestTravelArea(row,mode,arrivalUTC));}catch(e){const code=(e as {status?:number|null}).status;if(!code||[401,403,429].includes(code))throw e;failures.push({id:row.id,mode,error:(e as Error).message});console.log(`${row.name} ${mode}: ${(e as Error).message}`);}}
  }
  await new Promise(resolve=>setTimeout(resolve,1200));
 }
}
const report={version:1,provider:'TravelTime',calculatedAt:new Date().toISOString(),arrivalLondon,arrivalUTC,minutes:45,direction:'arrival',scope:'all-stages-with-labelled-estimates',eligibleCount:selected.length,expectedAreas:selected.length*2,receivedAreas:features.length,requests,reused,counts:Object.fromEntries(['driving','public_transport'].map(mode=>[mode,features.filter(f=>f.properties.mode===mode).length])),sourceInputs:selected.map(row=>({id:row.id,sourcePostcode:row.postcode,routingPostcode:row.location!.label,locationBasis:row.location!.precision==='estimated'?'estimated':'postcode',lat:row.location!.lat,lng:row.location!.lng,stage:row.stage})),failures};
await writeFile('data/coverage-planning.geojson.tmp',JSON.stringify({type:'FeatureCollection',features}));await rename('data/coverage-planning.geojson.tmp','data/coverage-planning.geojson');
await writeFile('reports/coverage-planning.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({areas:features.length,expected:report.expectedAreas,requests,reused,failures}));if(failures.length)process.exitCode=1;
