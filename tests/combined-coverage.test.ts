import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import {combineCoverage,coverageScope,type CombinedCoverage} from '../src/coverage.ts';
import type {Coverage,Initiative} from '../src/types.ts';
import {applyLocations} from '../server/geocoding.ts';
const shape=(id:string,x:number,mode='driving'):Coverage=>({type:'Feature',properties:{id,name:id,mode,arrival:'2026-10-30T08:30:00.000Z',minutes:45},geometry:{type:'MultiPolygon',coordinates:[[[[x,0],[x+2,0],[x+2,2],[x,2],[x,0]]]]}});
test('combined boundaries dissolve overlaps, preserve separate areas and update when a site is removed',()=>{
 const a=shape('a',0),b=shape('b',1),c=shape('c',10);
 const full=combineCoverage([a,b,c])!;
 assert.equal(full.geometry.coordinates.length,2);
 assert.equal(full.properties.count,3);
 assert.equal(booleanPointInPolygon([1.5,1],full),true);
 assert.equal(booleanPointInPolygon([2.5,1],full),true);
 assert.equal(booleanPointInPolygon([6,1],full),false);
 const filtered=combineCoverage([a,c])!;
 assert.equal(booleanPointInPolygon([2.5,1],filtered),false);
 assert.equal(combineCoverage([]),null);
 assert.throws(()=>combineCoverage([a,shape('other',1,'public_transport')]),/cannot be combined/);
});
test('an uncovered hole survives union and is filled only if a selected initiative covers it',()=>{
 const donut=shape('donut',0);donut.geometry.coordinates=[[[[0,0],[5,0],[5,5],[0,5],[0,0]],[[1,1],[2,1],[2,2],[1,2],[1,1]]]];
 const without=combineCoverage([donut,shape('remote',10)])!;
 assert.equal(booleanPointInPolygon([1.5,1.5],without),false);
 assert.equal(booleanPointInPolygon([1.5,1.5],combineCoverage([donut,shape('fill',1)])!),true);
});
test('real expanded data covers all 70 eligible open sites in both modes and excludes incomplete/planned records',()=>{
 const rows:Initiative[]=applyLocations(JSON.parse(readFileSync('data/initiatives.json','utf8')),JSON.parse(readFileSync('data/locations.json','utf8')));
 const features:Coverage[]=JSON.parse(readFileSync('data/coverage-open.geojson','utf8')).features;
 assert.equal(features.length,140);assert.equal(new Set(features.map(f=>f.properties.id+':'+f.properties.mode)).size,140);
 for(const mode of ['driving','public_transport']){
  const scope=coverageScope(rows,features.filter(f=>f.properties.mode===mode),false);
  assert.equal(scope.eligible.length,70);assert.equal(scope.calculated,70);assert.equal(scope.unlocated.length,20);assert.equal(scope.missing.length,0);assert.equal(scope.notOpen.length,42);
  const planned=coverageScope(rows,features.filter(f=>f.properties.mode===mode),true);
  assert.equal(planned.eligible.length,79);assert.equal(planned.missing.length,9);assert.equal(planned.unlocated.length,53);
 }
});
test('retained real union agrees with original per-site areas across a UK grid and site centroids',()=>{
 const features:Coverage[]=JSON.parse(readFileSync('data/coverage-open.geojson','utf8')).features;
 const merged:CombinedCoverage[]=JSON.parse(readFileSync('data/coverage-combined.geojson','utf8')).features;
 const inputs=JSON.parse(readFileSync('reports/coverage-open.json','utf8')).sourceInputs;
 const points:number[][]=inputs.map((p:{lat:number;lng:number})=>[p.lng,p.lat]);
 for(let lat=50;lat<=59;lat+=1)for(let lng=-8;lng<=1;lng+=1)points.push([lng+.173,lat+.287]);
 for(const mode of ['driving','public_transport']){
  const original=features.filter(f=>f.properties.mode===mode),combined=merged.find(f=>f.properties.mode===mode)!;
  assert.equal(combined.properties.count,70);
  for(const point of points)assert.equal(booleanPointInPolygon(point,combined),original.some(f=>booleanPointInPolygon(point,f)),`${mode} point ${point}`);
 }
});
