import {readFile} from 'node:fs/promises';
import path from 'node:path';
import type {CoverageManifest} from '../src/coverage-transport.js';
export const CHUNK_BYTES=1024*1024;
export async function loadCoverageTransport(folder:string){
 const manifest:CoverageManifest=JSON.parse(await readFile(path.join(folder,'coverage-manifest.json'),'utf8'));
 const payload=await readFile(path.join(folder,'coverage.json.gz'));
 if(manifest.transport!=='gzip-chunks-v1'||manifest.bytes!==payload.length||manifest.chunks.length!==Math.ceil(payload.length/CHUNK_BYTES))throw new Error('Invalid prepared Vercel coverage. Run npm run vercel-build.');
 return {manifest,chunk(index:number){if(!Number.isSafeInteger(index)||index<0||index>=manifest.chunks.length)return null;return payload.subarray(index*CHUNK_BYTES,Math.min(payload.length,(index+1)*CHUNK_BYTES));}};
}
