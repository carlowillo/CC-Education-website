import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import {applyLocations} from '../server/geocoding.ts';
import {applyEstimatedLocations} from '../src/locations.ts';
import {coverageScope,type CombinedCoverage} from '../src/coverage.ts';
import {stageGroup,type Coverage,type Initiative} from '../src/types.ts';
import {loadInitiatives,loadRetainedCoverage} from '../server/data.ts';
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const rows:Initiative[]=applyEstimatedLocations(applyLocations(read('data/initiatives.json'),read('data/locations.json')),read('data/estimated-locations.json'));
test('renamed initiatives retain their travel geometry and use current names in saved coverage',async()=>{
 const current=await loadInitiatives();
 const saved=await loadRetainedCoverage(current);
 const original:Coverage[]=read('data/coverage-planning.geojson').features;
 assert.equal(saved.features.length,264);
 assert.equal(current.find(row=>row.id==='1')!.name,'Providence Christian School');
 assert.equal(current.find(row=>row.id==='45')!.name,'Coed y Brenin');
 for(const feature of saved.features){
  const row=current.find(row=>row.id===feature.properties.id)!;
  const previous=original.find(area=>area.properties.id===row.id&&area.properties.mode===feature.properties.mode)!;
  assert.equal(feature.properties.name,row.name);
  assert.deepEqual(feature.geometry,previous.geometry);
  assert.deepEqual({...feature.properties,name:previous.properties.name},previous.properties);
 }
 assert.equal(saved.combined!.length,10);
});
test('live planning snapshot covers all 132 initiatives in both modes at one arrival time',()=>{
 const features:Coverage[]=read('data/coverage-planning.geojson').features,report=read('reports/coverage-planning.json');
 assert.equal(features.length,264);assert.equal(new Set(features.map(f=>f.properties.id+':'+f.properties.mode)).size,264);
 assert.equal(report.failures.length,0);assert.equal(report.eligibleCount,132);assert.equal(report.sourceInputs.length,132);
 assert.equal(new Set(features.map(f=>f.properties.arrival)).size,1);
 for(const feature of features){
  const row=rows.find(r=>r.id===feature.properties.id)!;assert.ok(row);
  const input=report.sourceInputs.find((r:{id:string})=>r.id===row.id);
  assert.equal(feature.properties.minutes,45);assert.equal(feature.properties.arrival,report.arrivalUTC);
  assert.equal(feature.properties.stageGroup,stageGroup(row.stage));assert.equal(feature.properties.routingPostcode,row.location!.label);
  assert.equal(feature.properties.locationBasis,row.location?.precision==='estimated'?'estimated':'postcode');
  assert.equal(input.sourcePostcode,row.postcode);assert.equal(input.lat,row.location!.lat);assert.equal(input.lng,row.location!.lng);
  assert.equal(booleanPointInPolygon([input.lng,input.lat],feature),true,`${row.name} ${feature.properties.mode} must contain its reference postcode`);
  for(const polygon of feature.geometry.coordinates)for(const ring of polygon){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));for(const point of ring)assert.ok(point.every(Number.isFinite));}
 }
 for(const mode of ['driving','public_transport']){
  const areas=features.filter(f=>f.properties.mode===mode);
  const all=coverageScope(rows,areas,true,true);assert.equal(all.calculated,132);assert.equal(all.estimated.length,53);assert.equal(all.missing.length,0);
  const open=coverageScope(rows,areas,false,true);assert.equal(open.calculated,90);assert.equal(open.estimated.length,20);
  const sourceOnly=coverageScope(rows,areas,true,false);assert.equal(sourceOnly.calculated,79);assert.equal(sourceOnly.unlocated.length,53);
 }
});
test('retained stage and estimate unions agree with individual areas at reference postcodes and UK grid points',()=>{
 const features:Coverage[]=read('data/coverage-planning.geojson').features;
 const combined:CombinedCoverage[]=read('data/coverage-planning-combined.geojson').features;
 assert.equal(combined.length,10);
 const points:number[][]=rows.map(r=>[r.location!.lng,r.location!.lat]);
 for(let lat=50;lat<=59;lat++)for(let lng=-8;lng<=1;lng++)points.push([lng+.173,lat+.287]);
 for(const union of combined){
  const p=union.properties,group=features.filter(f=>f.properties.mode===p.mode&&f.properties.stageGroup===p.stageGroup&&f.properties.locationBasis===p.locationBasis);
  assert.equal(p.count,group.length);assert.deepEqual([...p.initiativeIds].sort(),group.map(f=>f.properties.id).sort());
  for(const point of points)assert.equal(booleanPointInPolygon(point,union),group.some(f=>booleanPointInPolygon(point,f)),`${p.mode}/${p.stageGroup}/${p.locationBasis} at ${point}`);
 }
});
