import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultFilters,facetCounts,matchesFilters,type Filters} from '../src/filters.ts';
import type {Initiative} from '../src/types.ts';
const rows:Initiative[]=JSON.parse(readFileSync('data/initiatives.json','utf8'));
test('facet counts follow other groups, including the default open stage',()=>{
 const filters=defaultFilters();assert.deepEqual(facetCounts(rows,filters,'ethos'),{fully:67,strong:17,unclassified:6});
 filters.ethos=['strong'];assert.equal(rows.filter(r=>matchesFilters(r,filters)).length,17);
 assert.deepEqual(facetCounts(rows,filters,'stage'),{Open:17,'Developing a strategy':0,'Gathering a team':0,'Not recorded':0});
 assert.equal(facetCounts(rows,filters,'provision')['Full-Time school'],17);assert.equal(facetCounts(rows,filters,'provision')['Home Education Hub'],0);
});
test('multi-select uses OR inside a group and AND across groups without hiding alternatives',()=>{
 const filters:Filters={...defaultFilters(),ethos:['fully','strong'],provision:['Full-Time school','Home Education Hub']};
 assert.equal(rows.filter(r=>matchesFilters(r,filters)).length,66);
 const stageCounts=facetCounts(rows,filters,'stage');assert.equal(stageCounts.Open,66);assert.equal(stageCounts['Gathering a team'],10);
 // The ethos counts ignore ethos selection, retaining meaningful alternatives.
 assert.equal(facetCounts(rows,filters,'ethos').unclassified,3);
 filters.support=['High - inspired the vision'];
 for(const key of Object.keys(filters) as (keyof Filters)[]){
  const counts=facetCounts(rows,filters,key);
  for(const value of Object.keys(counts)){
   const withoutOwn={...filters,[key]:[value]};assert.equal(counts[value],rows.filter(r=>matchesFilters(r,withoutOwn)).length);
  }
 }
});
test('unchecking every option includes the whole group; reset restores the open default',()=>{
 const filters:Filters={ethos:[],stage:[],provision:[],support:[],organisation:[]};assert.equal(rows.filter(r=>matchesFilters(r,filters)).length,132);
 assert.equal(facetCounts(rows,filters,'ethos').fully,109);
 assert.equal(rows.filter(r=>matchesFilters(r,defaultFilters())).length,90);
});
