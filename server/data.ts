import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyLocations,postcodeKey} from './geocoding.js';
import {applyEstimatedLocations} from '../src/locations.js';
import type {Initiative,Coverage} from '../src/types.js';
import type {CombinedCoverage} from '../src/coverage.js';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export type RetainedCoverage={features:Coverage[];arrivalLondon:string|null;calculatedAt?:string;scope?:string;combined?:CombinedCoverage[];sourceInputs?:{id:string;lat:number;lng:number}[]};
export async function loadInitiatives(cacheDir?:string):Promise<Initiative[]>{
 const rows:Initiative[]=JSON.parse(await readFile(path.join(root,'data/initiatives.json'),'utf8'));
 applyLocations(rows,JSON.parse(await readFile(path.join(root,'data/locations.json'),'utf8')));
 if(cacheDir){try{const cached=JSON.parse(await readFile(path.join(cacheDir,'locations.json'),'utf8'));for(const row of rows)if(row.fullPostcode&&cached[row.id]?.precision==='postcode'&&postcodeKey(cached[row.id].label)===postcodeKey(row.postcode))row.location=cached[row.id];}catch{}}
 applyEstimatedLocations(rows,JSON.parse(await readFile(path.join(root,'data/estimated-locations.json'),'utf8')));
 return rows;
}
export async function loadRetainedCoverage(rows:Initiative[]):Promise<RetainedCoverage>{
 try{
  const collection=JSON.parse(await readFile(path.join(root,'data/coverage-planning.geojson'),'utf8'));
  const report=JSON.parse(await readFile(path.join(root,'reports/coverage-planning.json'),'utf8'));
  const features:Coverage[]=collection.features.filter((feature:Coverage)=>{const row=rows.find(r=>r.id===feature.properties.id);const input=report.sourceInputs.find((r:{id:string})=>r.id===row?.id);return row?.stage===input?.stage&&row?.location?.precision===(input?.locationBasis==='estimated'?'estimated':'postcode')&&row?.location?.label===input?.routingPostcode&&row?.location?.lat===input?.lat&&row?.location?.lng===input?.lng;});
  let combined:CombinedCoverage[]=[];
  if(features.length===collection.features.length)combined=JSON.parse(await readFile(path.join(root,'data/coverage-planning-combined.geojson'),'utf8')).features;
  return {features,arrivalLondon:report.arrivalLondon,calculatedAt:report.calculatedAt,scope:report.scope,combined,sourceInputs:report.sourceInputs};
 }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;return {features:[],arrivalLondon:null};}
}
