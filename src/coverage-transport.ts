export type CoverageManifest={transport:'gzip-chunks-v1';bytes:number;sha256:string;chunks:string[]};
export async function unpackCoverage(manifest:CoverageManifest,fetcher:typeof fetch=fetch){
 if(!Number.isSafeInteger(manifest.bytes)||manifest.bytes<=0||manifest.bytes>64*1024*1024||!/^[a-f0-9]{64}$/.test(manifest.sha256)||!Array.isArray(manifest.chunks)||!manifest.chunks.length||manifest.chunks.length>64||manifest.chunks.some((url,index)=>url!==`/api/coverage-saved/chunks/${index}`))throw new Error('The saved coverage manifest is invalid.');
 const parts:ArrayBuffer[]=[];
 for(let i=0;i<manifest.chunks.length;i+=3){
  const batch=await Promise.all(manifest.chunks.slice(i,i+3).map(async url=>{const response=await fetcher(url,{credentials:'same-origin'});if(!response.ok)throw new Error('Saved coverage could not be loaded. Sign in again or reload the page.');const bytes=await response.arrayBuffer();if(bytes.byteLength>1024*1024)throw new Error('Invalid saved coverage chunk.');return bytes;}));parts.push(...batch);
 }
 const packed=await new Blob(parts).arrayBuffer();
 if(packed.byteLength!==manifest.bytes)throw new Error('Saved coverage is incomplete. Reload the page.');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',packed)),b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==manifest.sha256)throw new Error('Saved coverage failed its integrity check. Reload the page.');
 const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
 const data=JSON.parse(await new Response(stream).text());
 if(!Array.isArray(data.features)||!Array.isArray(data.combined))throw new Error('The saved coverage data is invalid.');
 return data;
}
