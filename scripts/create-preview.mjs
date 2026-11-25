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
const estimates=JSON.parse(await read('data/estimated-locations.json'));
for(const row of rows){const entry=estimates.locations[row.id];if(!row.fullPostcode&&entry?.sourcePostcode===row.postcode&&entry.location?.precision==='estimated')row.location=entry.location;}
const coverage=JSON.parse(await read('data/coverage-planning.geojson'));
const validation=JSON.parse(await read('reports/coverage-planning.json'));
const combined=JSON.parse(await read('data/coverage-planning-combined.geojson'));
const validIds=new Set(validation.sourceInputs.filter(input=>{const row=rows.find(r=>r.id===input.id);return row?.stage===input.stage&&row?.location?.lat===input.lat&&row?.location?.lng===input.lng&&row?.location?.label===input.routingPostcode&&row?.location?.precision===(input.locationBasis==='estimated'?'estimated':'postcode');}).map(input=>input.id));
const names=new Map(rows.map(row=>[row.id,row.name]));
const features=coverage.features.filter(f=>validIds.has(f.properties.id)).map(feature=>({...feature,properties:{...feature.properties,name:names.get(feature.properties.id)}}));
const retained={...coverage,features,arrivalLondon:validation.arrivalLondon,calculatedAt:validation.calculatedAt,scope:validation.scope,combined:combined.features.filter(f=>f.properties.initiativeIds.every(id=>validIds.has(id)))};
const knownPostcodes=Object.fromEntries(rows.filter(r=>r.location&&['postcode','estimated'].includes(r.location.precision)).map(r=>[r.location.label.replace(/\s/g,'').toUpperCase(),{lat:r.location.lat,lng:r.location.lng,postcode:r.location.label}]));
const basemap=JSON.parse(await read('data/basemap.json'));
const places=JSON.parse(await read('data/places.json'));
const json=v=>JSON.stringify(v).replaceAll('<','\\u003c');
const packed=gzipSync(Buffer.from(JSON.stringify({'/api/initiatives':rows,'/api/basemap':basemap,'/api/places':places,'/api/coverage-saved':retained,knownPostcodes,'/api/status':{routingReady:false,offlinePreview:true,precise:rows.filter(r=>r.location?.precision==='postcode').length,total:rows.length}}))).toString('base64');
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
 if(url.startsWith('/api/postcode/')){
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  const pc=decodeURIComponent(url.slice('/api/postcode/'.length)).toUpperCase().replace(/\\s/g,'');
  if(!/^[A-Z]{1,2}\\d[A-Z\\d]?\\d[A-Z]{2}$/.test(pc))return reply({error:'Enter a full UK postcode, for example SW1A 1AA.'},400);
  if(previewData.knownPostcodes[pc])return reply(previewData.knownPostcodes[pc]);
  try{
   const response=await originalFetch('https://api.postcodes.io/postcodes/'+encodeURIComponent(pc),{signal:AbortSignal.timeout(15000)});
   if(response.status===404)return reply({error:'Postcode not found. Check the postcode and try again.'},404);
   if(!response.ok)throw new Error();
   const {result}=await response.json();
   if(result?.postcode?.replace(/\\s/g,'')!==pc||!Number.isFinite(result.latitude)||!Number.isFinite(result.longitude)||result.latitude<49||result.latitude>62||result.longitude < -9||result.longitude>3)throw new Error();
   const point={lat:result.latitude,lng:result.longitude,postcode:result.postcode};previewData.knownPostcodes[pc]=point;return reply(point);
  }catch{return reply({error:'This postcode needs an internet connection to Postcodes.io. Saved initiative and representative postcodes can be searched offline.'},503);}
 }
 if(url.startsWith('/api/'))return new Response(JSON.stringify({error:'This is the downloaded visual preview. Live postcode lookup and journey calculations require the hosted application.'}),{status:503,headers:{'Content-Type':'application/json'}});
 return originalFetch(input,init);
};
document.addEventListener('click',e=>{const a=e.target.closest('a');if(a?.getAttribute('href')==='/'){e.preventDefault();window.scrollTo(0,0);}});
`;
const js=await read('dist'+jsPath);
html=html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/,()=>`<script>${preload.replaceAll('</script','<\\/script')}</script><script type="module">${js.replaceAll('</script','<\\/script')}</script>`);
html=html.replace(/<link[^>]+href="[^"]+\.css"[^>]*>/,()=>`<style>${css}</style>`);
html=html.replace('<title>','<title>Offline preview · ');
const fontLicense=await read('public/brand/MONTSERRAT-LICENSE.txt');
html=html.replace('</head>',()=>`<script type="text/plain" id="montserrat-font-license">${fontLicense.replaceAll('</script','<\\/script')}</script></head>`);
await mkdir(path.join(root,'artifacts'),{recursive:true});
await writeFile(path.join(root,'artifacts/education-reach-preview.html'),html);
await mkdir(path.join(root,'preview'),{recursive:true});
await writeFile(path.join(root,'preview/education-reach-preview.html'),html);
console.log('Created artifacts/education-reach-preview.html — open it in a browser. Contains internal data; share only with authorised colleagues.');
