import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parsePostcodesResponse,applyLocations} from '../server/geocoding.ts';
import {arrivalRequest} from '../server/routing.ts';
import source from '../data/initiatives.json';
import type {Initiative,Coverage} from '../src/types.ts';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

test('geocoding rejects mismatched, missing and invalid coordinates without inventing precise locations',()=>{
 const snapshot=parsePostcodesResponse(['DE22 1FP','E7 8QT','G31 5JL','HS1 2YN'],{status:200,result:[
  {query:'DE22 1FP',result:{postcode:'DE22 1FP',latitude:52.93,longitude:-1.48}},
  {query:'E7 8QT',result:{postcode:'E16 1QU',latitude:51.5,longitude:0}},
  {query:'G31 5JL',result:null},
  {query:'HS1 2YN',result:{postcode:'HS1 2YN',latitude:NaN,longitude:-6}},
  {query:'SW1A 1AA',result:{postcode:'SW1A 1AA',latitude:51.5,longitude:0}},
 ]});
 assert.equal(Object.keys(snapshot.locations).length,1);assert.equal(Object.keys(snapshot.failures).length,3);
 assert.throws(()=>parsePostcodesResponse(['DE22 1FP'],{status:500}),/Invalid geocoding response/);
 const rows=structuredClone(source) as Initiative[];const before=rows.find(r=>r.id==='23')!.location;
 applyLocations(rows,snapshot);assert.equal(rows.find(r=>r.id==='9')!.location?.precision,'postcode');
 assert.deepEqual(rows.find(r=>r.id==='23')!.location,before);
});
test('saved real geocoding resolves 79 records and leaves all 53 incomplete source locations unaltered',()=>{
 const rows=applyLocations(structuredClone(source) as Initiative[],JSON.parse(readFileSync('data/locations.json','utf8')));
 assert.equal(rows.filter(r=>r.location?.precision==='postcode').length,79);
 assert.equal(rows.filter(r=>r.location?.precision==='district').length,41);
 assert.equal(rows.filter(r=>!r.location).length,12);
 assert.equal(rows.find(r=>r.postcode==='P03')!.location,null);
 assert.equal(rows.find(r=>r.id==='9')!.location?.label,'DE22 1FP');
 assert.deepEqual(rows.filter(r=>!r.fullPostcode),source.filter(r=>!r.fullPostcode));
});
test('both routing modes request arrival coverage at 2700 seconds and reject district locations',()=>{
 const rows=applyLocations(structuredClone(source) as Initiative[],JSON.parse(readFileSync('data/locations.json','utf8')));
 for(const mode of ['driving','public_transport'] as const){
  const request=arrivalRequest(rows.find(r=>r.id==='9')!,mode,'2026-10-30T08:30:00.000Z');
  assert.equal(request.arrival_searches[0].transportation.type,mode);assert.equal(request.arrival_searches[0].travel_time,2700);
  assert.equal(request.arrival_searches[0].arrival_time,'2026-10-30T08:30:00.000Z');
 }
 assert.throws(()=>arrivalRequest(rows.find(r=>r.id==='66')!,'driving','2026-10-30T08:30:00Z'),/resolved full postcode/);
});
test('saved live sample contains six distinct areas, destination centroids, closed rings and twelve passed journey comparisons',()=>{
 const rows=applyLocations(structuredClone(source) as Initiative[],JSON.parse(readFileSync('data/locations.json','utf8')));
 const features:Coverage[]=JSON.parse(readFileSync('data/coverage-sample.geojson','utf8')).features;
 assert.equal(features.length,6);assert.equal(new Set(features.map(f=>`${f.properties.id}:${f.properties.mode}`)).size,6);
 for(const f of features){
  const location=rows.find(r=>r.id===f.properties.id)!.location!;
  assert.equal(booleanPointInPolygon([location.lng,location.lat],f),true);
  for(const polygon of f.geometry.coordinates)for(const ring of polygon){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));}
 }
 const report=JSON.parse(readFileSync('reports/routing-validation.json','utf8'));
 assert.equal(report.pointToPointChecks.passed,12);assert.equal(report.pointToPointChecks.failed,0);
});
