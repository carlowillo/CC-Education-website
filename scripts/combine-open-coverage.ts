import {readFile,writeFile} from 'node:fs/promises';
import {combineCoverage} from '../src/coverage.ts';
import type {Coverage} from '../src/types.ts';
const features:Coverage[]=JSON.parse(await readFile('data/coverage-open.geojson','utf8')).features;
const combined=[];
for(const mode of ['driving','public_transport']){
 const start=Date.now();const result=combineCoverage(features.filter(f=>f.properties.mode===mode));
 if(result)combined.push(result);
 console.log(`${mode}: ${result?.properties.count||0} initiatives combined in ${Date.now()-start}ms`);
}
await writeFile('data/coverage-combined.geojson',JSON.stringify({type:'FeatureCollection',features:combined}));
