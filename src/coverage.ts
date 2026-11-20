import polygonClipping from 'polygon-clipping';
import type {Feature,MultiPolygon} from 'geojson';
import type {Coverage,Initiative,StageGroup} from './types';
import {canRoute} from './locations';
export type CombinedCoverage=Feature<MultiPolygon,{mode:string;arrival:string;minutes:number;initiativeIds:string[];count:number;stageGroup?:StageGroup;locationBasis?:'postcode'|'estimated'}>;
export function combineCoverage(features:Coverage[]):CombinedCoverage|null{
 if(!features.length)return null;
 const first=features[0].properties;
 if(features.some(f=>f.properties.mode!==first.mode||f.properties.arrival!==first.arrival||f.properties.minutes!==first.minutes))throw new Error('Areas with different travel modes, times or durations cannot be combined.');
 // Combine in a balanced tree: a single 70-site sweep exceeds the library's
 // event-queue limit. Early removal of shared boundaries keeps each pass bounded.
 // No radius approximation, simplification or coordinate rounding is applied.
 let geometries=features.map(f=>f.geometry.coordinates as polygonClipping.MultiPolygon);
 while(geometries.length>1){
  const next:polygonClipping.MultiPolygon[]=[];
  for(let i=0;i<geometries.length;i+=4){const group=geometries.slice(i,i+4);next.push(group.length===1?group[0]:polygonClipping.union(group[0],...group.slice(1)));}
  geometries=next;
 }
 const coordinates=geometries[0];
 return {type:'Feature',properties:{mode:first.mode,arrival:first.arrival,minutes:first.minutes,initiativeIds:[...new Set(features.map(f=>f.properties.id))].sort(),count:new Set(features.map(f=>f.properties.id)).size,...(features.every(f=>f.properties.stageGroup===first.stageGroup)?{stageGroup:first.stageGroup}:{}),...(features.every(f=>f.properties.locationBasis===first.locationBasis)?{locationBasis:first.locationBasis}:{})},geometry:{type:'MultiPolygon',coordinates}};
}
export function coverageGroups(features:Coverage[]){
 const groups=new Map<string,Coverage[]>();for(const feature of features){const p=feature.properties,key=[p.mode,p.stageGroup||'open',p.locationBasis||'postcode'].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(feature);}return [...groups.values()];
}
export function combineCoverageGroups(features:Coverage[],retained:CombinedCoverage[]=[]):CombinedCoverage[]{
 return coverageGroups(features).map(group=>{const first=group[0].properties,ids=[...new Set(group.map(f=>f.properties.id))].sort().join(',');return retained.find(f=>f.properties.mode===first.mode&&f.properties.arrival===first.arrival&&f.properties.minutes===first.minutes&&f.properties.stageGroup===first.stageGroup&&f.properties.locationBasis===first.locationBasis&&[...f.properties.initiativeIds].sort().join(',')===ids)||combineCoverage(group)!;});
}
export function coverageScope(rows:Initiative[],features:Coverage[],includePlanned:boolean,includeEstimated=true){
 const eligible=rows.filter(r=>canRoute(r,includeEstimated)&&(r.stage==='Open'||includePlanned));
 const eligibleIds=new Set(eligible.map(r=>r.id));
 const visible=features.filter(f=>eligibleIds.has(f.properties.id));
 const calculatedIds=new Set(visible.map(f=>f.properties.id));
 return {eligible,visible,calculated:calculatedIds.size,estimated:eligible.filter(r=>r.location?.precision==='estimated'),missing:eligible.filter(r=>!calculatedIds.has(r.id)),unlocated:rows.filter(r=>!canRoute(r,includeEstimated)&&(r.stage==='Open'||includePlanned)),notOpen:includePlanned?[]:rows.filter(r=>r.stage!=='Open')};
}
