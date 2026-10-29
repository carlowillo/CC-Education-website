import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';

test('hosted password gate protects pages, assets and internal data; health check stays non-sensitive',async()=>{
 const password=randomBytes(24).toString('hex');
 const child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:'3107',ADMIN_USERNAME:'viewer',ADMIN_PASSWORD:password},stdio:'ignore'});
 const url='http://127.0.0.1:3107';
 try{
  let ready=false;
  for(let i=0;i<100;i++){
   try{ready=(await fetch(url+'/healthz')).ok;if(ready)break;}catch{}
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  assert.equal(ready,true,'Protected test server must start');
  for(const target of ['/','/api/initiatives','/api/status','/api/coverage-saved','/assets/anything.js']){
   const r=await fetch(url+target);assert.equal(r.status,401);assert.ok(r.headers.get('www-authenticate')?.startsWith('Basic '));
  }
  const wrong=await fetch(url+'/api/initiatives',{headers:{Authorization:'Basic '+Buffer.from('viewer:wrong').toString('base64')}});assert.equal(wrong.status,401);
  const headers={Authorization:'Basic '+Buffer.from('viewer:'+password).toString('base64')};
  const page=await fetch(url,{headers});assert.equal(page.status,200);assert.match(page.headers.get('cache-control')||'',/no-store/);
  const data=await fetch(url+'/api/initiatives',{headers});assert.equal(data.status,200);assert.equal((await data.json()).length,132);
  const saved=await (await fetch(url+'/api/coverage-saved',{headers})).json();assert.equal(saved.features.length,140);assert.equal(saved.combined.length,2);
  const health=await fetch(url+'/healthz');assert.deepEqual(await health.json(),{status:'ok'});
 }finally{child.kill();}
});

test('external hosting refuses to start without a strong password',async()=>{
 const child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,NODE_ENV:'production',HOST:'0.0.0.0',PORT:'3108',ADMIN_PASSWORD:''},stdio:'ignore'});
 const exit=await new Promise(resolve=>child.once('exit',resolve));assert.equal(exit,1);
});
