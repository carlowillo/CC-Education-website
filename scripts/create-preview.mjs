// Create a single HTML file that can be opened without Node, npm or a server.
// It deliberately contains no credentials and does not simulate travel coverage.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>readFile(path.join(root,p),'utf8');
let html=await read('dist/index.html');
const jsPath=html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1];
const cssPath=html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];
if(!jsPath||!cssPath)throw new Error('Run npm run build first.');
let css=await read('dist'+cssPath);
for(const match of [...css.matchAll(/url\(([^)]+)\)/g)]){
 const url=match[1].replaceAll('"','').replaceAll("'",'');
 if(url.startsWith('data:')||url.startsWith('http')||url.startsWith('#'))continue;
 const asset=await readFile(path.join(root,'dist',url.replace(/^\//,'')));
 const mime=url.endsWith('.woff2')?'font/woff2':url.endsWith('.png')?'image/png':'application/octet-stream';
 css=css.replaceAll(match[0],`url(data:${mime};base64,${asset.toString('base64')})`);
}
const rows=JSON.parse(await read('data/initiatives.json'));
const locations=JSON.parse(await read('data/locations.json'));
for(const row of rows){const key=row.postcode.replace(/\s/g,'').toUpperCase();if(row.fullPostcode&&locations.locations[key])row.location=locations.locations[key];}
const coverage=JSON.parse(await read('data/coverage-open.geojson'));
const validation=JSON.parse(await read('reports/coverage-open.json'));
const combined=JSON.parse(await read('data/coverage-combined.geojson'));
const retained={...coverage,arrivalLondon:validation.arrivalLondon,calculatedAt:validation.calculatedAt,scope:'open',combined:combined.features};
const basemap=JSON.parse(await read('data/basemap.json'));
const places=JSON.parse(await read('data/places.json'));
const json=v=>JSON.stringify(v).replaceAll('<','\\u003c');
const packed=gzipSync(Buffer.from(JSON.stringify({'/api/initiatives':rows,'/api/basemap':basemap,'/api/places':places,'/api/coverage-saved':retained,'/api/status':{routingReady:false,offlinePreview:true,precise:rows.filter(r=>r.location?.precision==='postcode').length,total:rows.length}}))).toString('base64');
const preload=`
const previewReady=(async()=>{
 const bytes=Uint8Array.from(atob(${json(packed)}),c=>c.charCodeAt(0));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 return JSON.parse(await new Response(stream).text());
})();
const originalFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
 const url=typeof input==='string'?input:input.url;
 const previewData=await previewReady;
 if(previewData[url])return new Response(JSON.stringify(previewData[url]),{headers:{'Content-Type':'application/json'}});
 if(url.startsWith('/api/'))return new Response(JSON.stringify({error:'This is the downloaded visual preview. Live postcode lookup and journey calculations require the hosted application.'}),{status:503,headers:{'Content-Type':'application/json'}});
 return originalFetch(input,init);
};
document.addEventListener('click',e=>{const a=e.target.closest('a');if(a?.getAttribute('href')==='/'){e.preventDefault();window.scrollTo(0,0);}});
`;
const js=await read('dist'+jsPath);
html=html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/,()=>`<script>${preload.replaceAll('</script','<\\/script')}</script><script type="module">${js.replaceAll('</script','<\\/script')}</script>`);
html=html.replace(/<link[^>]+href="[^"]+\.css"[^>]*>/,()=>`<style>${css}</style>`);
html=html.replace('<title>','<title>Offline preview · ');
html=html.replace('</body>','<div style="margin:0 38px 12px;text-align:center;font:10px system-ui;background:#fff8e8;color:#695c37;border:1px solid #d4c490;border-radius:5px;padding:6px 10px">Internal preview · real coverage for 70 open initiatives · live recalculation requires server</div></body>');
await mkdir(path.join(root,'artifacts'),{recursive:true});
await writeFile(path.join(root,'artifacts/education-reach-preview.html'),html);
await mkdir(path.join(root,'preview'),{recursive:true});
await writeFile(path.join(root,'preview/education-reach-preview.html'),html);
console.log('Created artifacts/education-reach-preview.html — open it in a browser. Contains internal data; share only with authorised colleagues.');
