import polygonClipping from 'polygon-clipping';
import type {Feature,MultiPolygon} from 'geojson';
import type {Coverage,Initiative} from './types';
export type CombinedCoverage=Feature<MultiPolygon,{mode:string;arrival:string;minutes:number;initiativeIds:string[];count:number}>;
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
 return {type:'Feature',properties:{mode:first.mode,arrival:first.arrival,minutes:first.minutes,initiativeIds:[...new Set(features.map(f=>f.properties.id))].sort(),count:new Set(features.map(f=>f.properties.id)).size},geometry:{type:'MultiPolygon',coordinates}};
}
export function coverageScope(rows:Initiative[],features:Coverage[],includePlanned:boolean){
 const precise=(r:Initiative)=>r.fullPostcode&&r.location?.precision==='postcode';
 const eligible=rows.filter(r=>precise(r)&&(r.stage==='Open'||includePlanned));
 const eligibleIds=new Set(eligible.map(r=>r.id));
 const visible=features.filter(f=>eligibleIds.has(f.properties.id));
 const calculatedIds=new Set(visible.map(f=>f.properties.id));
 return {eligible,visible,calculated:calculatedIds.size,missing:eligible.filter(r=>!calculatedIds.has(r.id)),unlocated:rows.filter(r=>!precise(r)&&(r.stage==='Open'||includePlanned)),notOpen:includePlanned?[]:rows.filter(r=>r.stage!=='Open')};
}
