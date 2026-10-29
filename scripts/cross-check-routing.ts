import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import {applyLocations} from '../server/geocoding.ts';
import type {Initiative,Coverage} from '../src/types.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const report=JSON.parse(await readFile(path.join(root,'reports/routing-validation.json'),'utf8'));
const rows:Initiative[]=applyLocations(JSON.parse(await readFile(path.join(root,'data/initiatives.json'),'utf8')),JSON.parse(await readFile(path.join(root,'data/locations.json'),'utf8')));
const features:Coverage[]=JSON.parse(await readFile(path.join(root,'data/coverage-sample.geojson'),'utf8')).features;
const pairs=[{destination:'9',near:'8',far:'23'},{destination:'23',near:'49',far:'32'},{destination:'32',near:'33',far:'9'}];
const get=(id:string)=>rows.find(r=>r.id===id)!;
const ids=[...new Set(pairs.flatMap(p=>[p.destination,p.near,p.far]))];
const locations=ids.map(id=>({id,coords:{lat:get(id).location!.lat,lng:get(id).location!.lng}}));
const checks=[];
for(const mode of ['driving','public_transport']){
 const response=await fetch('https://api.traveltimeapp.com/v4/time-filter',{method:'POST',headers:{'Content-Type':'application/json','X-Application-Id':process.env.TRAVELTIME_APP_ID!,'X-Api-Key':process.env.TRAVELTIME_API_KEY!},body:JSON.stringify({locations,arrival_searches:pairs.map(p=>({id:p.destination,arrival_location_id:p.destination,departure_location_ids:[p.near,p.far],transportation:{type:mode},arrival_time:report.arrivalUTC,travel_time:2700,properties:['travel_time']}))}),signal:AbortSignal.timeout(45000)});
 if(!response.ok){checks.push({mode,outcome:'unavailable',httpStatus:response.status});continue;}
 const body=await response.json();
 for(const pair of pairs){
  const result=body.results?.find((r:{search_id:string})=>r.search_id===pair.destination);
  const shape=features.find(f=>f.properties.id===pair.destination&&f.properties.mode===mode)!;
  for(const [kind,id] of [['near',pair.near],['far',pair.far]]){
   const travel=result?.locations?.find((r:{id:string})=>r.id===id);
   const seconds=travel?.properties?.[0]?.travel_time;
   const matrixReachable=Number.isFinite(seconds)&&seconds<=2700;
   const matrixUnreachable=result?.unreachable?.includes(id);
   const p=get(id).location!;
   const polygonContains=booleanPointInPolygon([p.lng,p.lat],shape);
   checks.push({destination:pair.destination,origin:id,originPostcode:get(id).postcode,kind,mode,travelSeconds:seconds??null,matrixReachable,matrixUnreachable:!!matrixUnreachable,polygonContains,outcome:(matrixReachable||matrixUnreachable)&&matrixReachable===polygonContains?'passed':'failed'});
  }
 }
}
report.pointToPointChecks={checkedAt:new Date().toISOString(),endpoint:'/v4/time-filter',checks,passed:checks.filter(c=>c.outcome==='passed').length,failed:checks.filter(c=>c.outcome==='failed').length,notes:['Checks compare separately requested point-to-point arrival travel times with membership of the saved 45-minute polygons.','Origin points are other resolved postcodes from the dataset; these are diagnostic test journeys, not claims about families.']};
await writeFile(path.join(root,'reports/routing-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.pointToPointChecks,null,2));
if(report.pointToPointChecks.failed||checks.some(c=>c.outcome==='unavailable'))process.exitCode=1;
