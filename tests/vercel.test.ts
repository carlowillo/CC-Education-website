import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';
import {unpackCoverage,type CoverageManifest} from '../src/coverage-transport.ts';

test('Vercel requires a password even when the function host is localhost',async()=>{
 const environment:NodeJS.ProcessEnv={...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:'3116',ADMIN_PASSWORD:''};
 delete environment.VERCEL;
 const child=spawn(process.execPath,['--import','tsx','tests/fixtures/vercel-function-server.ts'],{env:environment,stdio:'ignore'});
 const result=await new Promise(resolve=>child.once('exit',resolve));assert.equal(result,1);
});

test('the Vercel entry protects HTML, assets, data and chunks, and delivers all 264 areas below response limits',async()=>{
 const password=randomBytes(24).toString('hex'),temporary=await mkdtemp(path.join(tmpdir(),'education-vercel-'));
 const child=spawn(process.execPath,['--import','tsx','tests/fixtures/vercel-function-server.ts'],{env:{...process.env,VERCEL:'1',NODE_ENV:'production',HOST:'127.0.0.1',PORT:'3115',ADMIN_USERNAME:'viewer',ADMIN_PASSWORD:password,TMPDIR:temporary},stdio:'ignore'});
 const base='http://127.0.0.1:3115',headers={Authorization:'Basic '+Buffer.from('viewer:'+password).toString('base64')};
 try{
  let ready=false;for(let i=0;i<150;i++){try{ready=(await fetch(base+'/healthz')).ok;if(ready)break;}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
  assert.equal(ready,true,'Vercel function entry must start');
  const index=await readFile('dist/index.html','utf8'),asset=index.match(/src="([^"]+\.js)"/)![1];
  for(const url of ['/',asset,'/api/initiatives','/api/coverage-saved','/api/coverage-saved/chunks/0','/data/initiatives.json','/preview/education-reach-preview.html']){
   const response=await fetch(base+url);assert.equal(response.status,401,url);assert.match(response.headers.get('www-authenticate')||'',/^Basic /);assert.equal(response.headers.get('cache-control'),'no-store');
  }
  assert.equal((await fetch(base+'/api/coverage-saved/chunks/0',{headers:{Authorization:'Basic '+Buffer.from('viewer:incorrect').toString('base64')}})).status,401);
  const page=await fetch(base,{headers});assert.equal(page.status,200);assert.match(page.headers.get('cache-control')||'',/private.*no-store/);
  const js=await fetch(base+asset,{headers});assert.equal(js.status,200);assert.equal((await js.text()).includes(password),false);
  const status=await (await fetch(base+'/api/status',{headers})).json();assert.equal(status.serverless,true);assert.equal(status.coverageBatchSize,1);assert.equal(status.total,132);
  const manifest:CoverageManifest=await (await fetch(base+'/api/coverage-saved',{headers})).json();assert.equal(manifest.transport,'gzip-chunks-v1');assert.ok(manifest.chunks.length>1);
  let requests=0;
  const decoded=await unpackCoverage(manifest,async(url,init)=>{const response=await fetch(base+url,{...init,headers});requests++;assert.equal(response.status,200);const length=Number(response.headers.get('content-length'));assert.ok(length>0&&length<=1024*1024);return response;});
  assert.equal(requests,manifest.chunks.length);assert.equal(decoded.features.length,264);assert.equal(decoded.combined.length,10);assert.equal(decoded.arrivalLondon,'2026-11-23T08:30');
  const initiatives=await (await fetch(base+'/api/initiatives',{headers})).json();
  const names=new Map(initiatives.map((row:{id:string;name:string})=>[row.id,row.name]));
  for(const feature of decoded.features)assert.equal(feature.properties.name,names.get(feature.properties.id),'protected coverage must use the updated workbook names');
  for(const index of ['-1','not-a-number','999999'])assert.equal((await fetch(base+'/api/coverage-saved/chunks/'+index,{headers})).status,404);
  assert.ok((await stat(path.join(temporary,'cc-education-reach'))).isDirectory());
  const geocode=await fetch(base+'/api/geocode',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'});assert.equal(geocode.status,200);assert.equal((await geocode.json()).resolved,0);
  const cross=await fetch(base+'/api/geocode',{method:'POST',headers:{...headers,Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(cross.status,403);
 }finally{if(child.exitCode===null&&child.signalCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited;}await rm(temporary,{recursive:true,force:true});}
});

test('coverage transport preserves Unicode and rejects tampered, truncated or external chunks',async()=>{
 const data={features:[],combined:[],label:'Christ-centred · éducation 🗺️'};
 const packed=gzipSync(JSON.stringify(data));
 const manifest:CoverageManifest={transport:'gzip-chunks-v1',bytes:packed.length,sha256:createHash('sha256').update(packed).digest('hex'),chunks:['/api/coverage-saved/chunks/0']};
 const response=async()=>new Response(packed);
 assert.deepEqual(await unpackCoverage(manifest,response),data);
 await assert.rejects(unpackCoverage({...manifest,sha256:'0'.repeat(64)},response),/integrity/);
 await assert.rejects(unpackCoverage({...manifest,bytes:packed.length+1},response),/incomplete/);
 let called=false;
 await assert.rejects(unpackCoverage({...manifest,chunks:['https://untrusted.example/data']},async()=>{called=true;return new Response();}),/invalid/);assert.equal(called,false);
});
