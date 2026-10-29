import {test} from 'node:test';
import assert from 'node:assert/strict';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import {eligible,londonToISO,toFeature} from '../server/logic.ts';
import data from '../data/initiatives.json';
import type {Initiative} from '../src/types.ts';

test('district centroids cannot be used for travel coverage, even with a source full postcode',()=>{
 const r=data[0] as Initiative;
 assert.equal(r.fullPostcode,true);assert.equal(eligible(r),false);
 assert.equal(eligible({...r,location:{...r.location!,precision:'postcode'}}),true);
 assert.equal(eligible({...r,fullPostcode:false,location:{...r.location!,precision:'postcode'}}),false);
});
test('arrival wall time uses London daylight saving, not the server timezone',()=>{
 assert.equal(londonToISO('2026-07-01T08:30'),'2026-07-01T07:30:00.000Z');
 assert.equal(londonToISO('2026-12-01T08:30'),'2026-12-01T08:30:00.000Z');
 assert.throws(()=>londonToISO('2027-03-28T01:30'),/does not exist/);
 assert.throws(()=>londonToISO('tomorrow'),/valid arrival/);
 assert.throws(()=>londonToISO('2026-02-31T08:30'),/Invalid arrival/);
});
test('routing conversion preserves holes, closes rings and uses longitude first',()=>{
 const f=toFeature(data[0] as Initiative,[{shell:[{lat:50,lng:0},{lat:50,lng:4},{lat:54,lng:4},{lat:54,lng:0}],holes:[[{lat:51,lng:1},{lat:51,lng:2},{lat:52,lng:2},{lat:52,lng:1}]]}],'driving','2026-12-01T08:30:00Z');
 assert.deepEqual(f.geometry.coordinates[0][0][0],[0,50]);
 assert.deepEqual(f.geometry.coordinates[0][0].at(-1),[0,50]);
 assert.equal(booleanPointInPolygon([3,53],f),true);
 assert.equal(booleanPointInPolygon([1.5,51.5],f),false);
 assert.equal(booleanPointInPolygon([5,55],f),false);
 assert.equal(f.properties.minutes,45);
});
test('all 132 source rows are retained without inventing unresolved locations',()=>{
 assert.equal(data.length,132);assert.equal(new Set(data.map(r=>r.id)).size,132);
 assert.equal(data.filter(r=>r.stage==='Open').length,90);
 assert.equal(data.filter(r=>r.fullPostcode).length,79);
 assert.equal(data.filter(r=>!r.location).length,12);
 assert.equal(data.find(r=>r.postcode==='P03')!.location,null);
});
