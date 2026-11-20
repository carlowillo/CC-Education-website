import {readFile,writeFile,rename} from 'node:fs/promises';
import {parsePostcodesResponse} from '../server/geocoding.ts';
import type {Initiative} from '../src/types.ts';
import type {EstimatedLocations} from '../src/locations.ts';

const rows:Initiative[]=JSON.parse(await readFile('data/initiatives.json','utf8'));
// Broad areas use a central reference district, never an asserted school address.
const anchors:Record<string,{district:string;basis:string}>={
 BS:{district:'BS1',basis:'Broad Bristol postcode area; central BS1 reference chosen.'},
 CB:{district:'CB1',basis:'Broad Cambridge postcode area; central CB1 reference chosen.'},
 HU:{district:'HU1',basis:'Broad Hull postcode area; central HU1 reference chosen.'},
 TN:{district:'TN1',basis:'Broad Tunbridge Wells postcode area; central TN1 reference chosen.'},
 GL:{district:'GL1',basis:'Broad Gloucester postcode area; central GL1 reference chosen.'},
 KT:{district:'KT1',basis:'Broad Kingston postcode area; central KT1 reference chosen.'},
 CH:{district:'CH1',basis:'Broad Chester postcode area; central CH1 reference chosen.'},
 DH:{district:'DH1',basis:'Broad Durham postcode area; central DH1 reference chosen.'},
 'SOUTH EAST LONDON':{district:'SE1',basis:'Broad South East London description; central SE1 reference chosen.'},
 DAGENHAM:{district:'RM10',basis:'Dagenham town description; RM10 reference chosen.'},
 P03:{district:'PO3',basis:'Source P03 is invalid. Assumed letter O in PO3 (Portsmouth); this assumption requires confirmation.'}
};
let snapshot:EstimatedLocations={version:1,resolvedAt:new Date().toISOString(),locations:{},failures:{}};
try{snapshot=JSON.parse(await readFile('data/estimated-locations.json','utf8'));}catch{}
async function get(url:string){const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`Postcodes.io HTTP ${response.status}`);const body=await response.json();if(body.status!==200)throw new Error('Invalid postcode lookup response');return body.result;}
const chosen=new Map<string,NonNullable<Initiative['location']>>();
for(const row of rows.filter(r=>!r.fullPostcode)){
 if(snapshot.locations[row.id]?.sourcePostcode===row.postcode)continue;
 const {district,basis}=anchors[row.postcode]||{district:row.postcode,basis:`Representative active postcode near the centre of recorded district ${row.postcode}.`};
 try{
  let location=chosen.get(district);
  if(!location){
   const centre=await get('https://api.postcodes.io/outcodes/'+encodeURIComponent(district));
   let candidates:any[]=[];
   for(const radius of [2000,20000]){
    candidates=(await get(`https://api.postcodes.io/postcodes?lon=${centre.longitude}&lat=${centre.latitude}&radius=${radius}&limit=100`))||[];
    candidates=candidates.filter(p=>p.outcode===district);if(candidates.length)break;
   }
   if(!candidates.length)throw new Error(`No current postcode found within ${district}`);
   candidates.sort((a,b)=>a.distance-b.distance||a.postcode.localeCompare(b.postcode));
   const candidate=candidates[0];
   const checked=parsePostcodesResponse([candidate.postcode],{status:200,result:[{query:candidate.postcode,result:candidate}]});
   const verified=Object.values(checked.locations)[0];if(!verified)throw new Error('Representative postcode failed coordinate validation');
   location={...verified,precision:'estimated',referenceArea:district,source:'Postcodes.io representative active postcode (estimated initiative location)'};chosen.set(district,location);
  }
  snapshot.locations[row.id]={sourcePostcode:row.postcode,location:{...location,estimateBasis:basis}};delete snapshot.failures[row.id];
  console.log(`${row.name}: ${row.postcode} -> ${location.label} (estimate)`);
 }catch(error){snapshot.failures[row.id]=(error as Error).message;console.log(`${row.name}: ${(error as Error).message}`);}
 snapshot.resolvedAt=new Date().toISOString();await writeFile('data/estimated-locations.json.tmp',JSON.stringify(snapshot,null,2)+'\n');await rename('data/estimated-locations.json.tmp','data/estimated-locations.json');
}
const quote=(v:unknown)=>'"'+String(v??'').replaceAll('"','""')+'"';
const report=[['initiative','sourceLocation','representativePostcode','referenceArea','latitude','longitude','basis'],...rows.filter(r=>!r.fullPostcode).map(row=>{const loc=snapshot.locations[row.id]?.location;return [row.name,row.postcode,loc?.label,loc?.referenceArea,loc?.lat,loc?.lng,loc?.estimateBasis||snapshot.failures[row.id]];})].map(cells=>cells.map(quote).join(',')).join('\r\n');
await writeFile('reports/estimated-locations.csv',report+'\r\n');
console.log(JSON.stringify({estimates:Object.keys(snapshot.locations).length,failures:snapshot.failures}));
if(Object.keys(snapshot.failures).length)process.exitCode=1;
