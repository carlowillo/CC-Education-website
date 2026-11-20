import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyLocations} from '../server/geocoding.ts';
import {applyEstimatedLocations,canRoute,isPrecise,type EstimatedLocations} from '../src/locations.ts';
import {coverageScope,combineCoverageGroups} from '../src/coverage.ts';
import {arrivalRequest,requestTravelAreas,RoutingError} from '../server/routing.ts';
import {toFeature} from '../server/logic.ts';
import type {Initiative} from '../src/types.ts';
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const rows=()=>applyEstimatedLocations(applyLocations(read('data/initiatives.json'),read('data/locations.json')),read('data/estimated-locations.json')) as Initiative[];
test('all estimates preserve the source values and never become precise school addresses',()=>{
 const source:Initiative[]=read('data/initiatives.json'),merged=rows();
 assert.equal(merged.filter(isPrecise).length,79);assert.equal(merged.filter(r=>r.location?.precision==='estimated').length,53);
 assert.equal(merged.filter(r=>canRoute(r,true)).length,132);assert.equal(merged.filter(r=>canRoute(r,false)).length,79);
 for(let i=0;i<source.length;i++){assert.equal(merged[i].postcode,source[i].postcode);assert.equal(merged[i].fullPostcode,source[i].fullPostcode);}
 const typo=merged.find(r=>r.postcode==='P03')!;assert.equal(typo.location?.referenceArea,'PO3');assert.match(typo.location!.estimateBasis!,/Assumed/);
 const broad=merged.find(r=>r.postcode==='BS')!;assert.equal(broad.location?.referenceArea,'BS1');assert.match(broad.location!.estimateBasis!,/Broad/);
 assert.equal(coverageScope(merged,[],false,true).eligible.length,90);assert.equal(coverageScope(merged,[],true,true).eligible.length,132);
 assert.equal(coverageScope(merged,[],false,false).eligible.length,70);assert.equal(coverageScope(merged,[],false,false).unlocated.length,20);
});
test('estimated snapshots cannot override full postcodes or apply to changed source locations',()=>{
 const source=rows(),estimate=source.find(r=>r.postcode==='NP7')!;
 const snapshot:EstimatedLocations={version:1,resolvedAt:'test',locations:{[source[0].id]:{sourcePostcode:source[0].postcode,location:estimate.location!},[estimate.id]:{sourcePostcode:'CHANGED',location:estimate.location!}},failures:{}};
 const original=source[0].location;applyEstimatedLocations(source,snapshot);assert.deepEqual(source[0].location,original);
 const blank={...estimate,location:null};applyEstimatedLocations([blank],snapshot);assert.equal(blank.location,null);
 assert.equal(canRoute({...estimate,location:{...estimate.location!,lat:NaN}},true),false);
});
test('routing uses representative coordinates and exports stage and estimate provenance separately',()=>{
 const estimate=rows().find(r=>r.id==='66')!;
 const request=arrivalRequest(estimate,'driving','2026-11-23T08:30:00.000Z');assert.deepEqual(request.arrival_searches[0].coords,{lat:estimate.location!.lat,lng:estimate.location!.lng});
 const shape=[{shell:[{lat:50,lng:0},{lat:50,lng:1},{lat:51,lng:1}],holes:[]}];
 const feature=toFeature(estimate,shape,'driving','2026-11-23T08:30:00.000Z');assert.equal(feature.properties.stageGroup,'developing');assert.equal(feature.properties.locationBasis,'estimated');assert.equal(feature.properties.routingPostcode,estimate.location!.label);
 const precise=toFeature(rows()[0],shape,'driving','2026-11-23T08:30:00.000Z');
 const openEstimate=toFeature(rows().find(r=>r.id==='45')!,shape,'driving','2026-11-23T08:30:00.000Z');
 const groups=combineCoverageGroups([feature,precise,openEstimate]);assert.equal(groups.length,3);assert.equal(groups.filter(f=>f.properties.stageGroup==='open').length,2);assert.equal(groups.filter(f=>f.properties.locationBasis==='estimated').length,2);
});
test('routing batches correlate results by ID and send only coordinates, IDs and journey settings',async()=>{
 const selected=rows().filter(r=>['1','45','66'].includes(r.id));
 const oldId=process.env.TRAVELTIME_APP_ID,oldKey=process.env.TRAVELTIME_API_KEY;
 process.env.TRAVELTIME_APP_ID='test-only';process.env.TRAVELTIME_API_KEY='test-only';
 try{
  const shape={shell:[{lat:50,lng:0},{lat:50,lng:1},{lat:51,lng:1}],holes:[]};
  let payload:any;
  const mocked:typeof fetch=async(_url,init)=>{payload=JSON.parse(init!.body as string);return Response.json({results:[...selected].reverse().map(r=>({search_id:r.id,shapes:[shape]}))});};
  const result=await requestTravelAreas(selected,'public_transport','2026-11-23T08:30:00.000Z',mocked);
  assert.deepEqual(result.map(f=>f.properties.id),selected.map(r=>r.id));assert.equal(payload.arrival_searches.length,3);
  for(const search of payload.arrival_searches){assert.deepEqual(Object.keys(search).sort(),['arrival_time','coords','id','transportation','travel_time']);assert.equal(search.travel_time,2700);assert.equal(search.transportation.type,'public_transport');}
  await assert.rejects(requestTravelAreas(selected,'driving','2026-11-23T08:30:00.000Z',async()=>Response.json({error_code:1},{status:429})),(e:unknown)=>e instanceof RoutingError&&e.status===429);
  await assert.rejects(requestTravelAreas(selected,'driving','2026-11-23T08:30:00.000Z',async()=>Response.json({results:[]})),/returned no area/);
 }finally{
  if(oldId===undefined)delete process.env.TRAVELTIME_APP_ID;else process.env.TRAVELTIME_APP_ID=oldId;
  if(oldKey===undefined)delete process.env.TRAVELTIME_API_KEY;else process.env.TRAVELTIME_API_KEY=oldKey;
 }
});
