import type {Initiative} from '../src/types.ts';
export const postcodeKey=(value:string)=>value.toUpperCase().replace(/\s/g,'');
export type Location=NonNullable<Initiative['location']> & {geocodedAt?:string;quality?:number};
export type LocationSnapshot={version:1;provider:'Postcodes.io';resolvedAt:string;locations:Record<string,Location>;failures:Record<string,string>};

export function parsePostcodesResponse(postcodes:string[],body:unknown,at=new Date().toISOString()):LocationSnapshot{
 const data=body as {status?:number;result?:{query:string;result:null|{postcode:string;latitude:number;longitude:number;quality?:number}}[]};
 if(data?.status!==200||!Array.isArray(data.result))throw new Error('Invalid geocoding response; previous coordinates have been preserved.');
 const expected=new Set(postcodes.map(postcodeKey));
 const snapshot:LocationSnapshot={version:1,provider:'Postcodes.io',resolvedAt:at,locations:{},failures:Object.fromEntries([...expected].map(k=>[k,'No result returned']))};
 for(const item of data.result){
  if(typeof item.query!=='string')continue;
  const key=postcodeKey(item.query);if(!expected.has(key))continue;
  const r=item.result;
  if(!r){snapshot.failures[key]='Full postcode not found in the current postcode database';continue;}
  if(typeof r.postcode!=='string'||postcodeKey(r.postcode)!==key){snapshot.failures[key]='Returned postcode did not match the source; manual review required';continue;}
  if(!Number.isFinite(r.latitude)||!Number.isFinite(r.longitude)||r.latitude<49||r.latitude>62||r.longitude < -9||r.longitude>3){snapshot.failures[key]='Invalid UK coordinates returned';continue;}
  snapshot.locations[key]={lat:r.latitude,lng:r.longitude,precision:'postcode',label:r.postcode,source:'Postcodes.io',geocodedAt:at,...(Number.isFinite(r.quality)?{quality:r.quality}:{})};
  delete snapshot.failures[key];
 }
 return snapshot;
}
export async function resolvePostcodes(rows:Initiative[],fetcher:typeof fetch=fetch):Promise<LocationSnapshot>{
 const postcodes=[...new Map(rows.filter(r=>r.fullPostcode).map(r=>[postcodeKey(r.postcode),r.postcode])).values()];
 const response=await fetcher('https://api.postcodes.io/postcodes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postcodes}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(`Postcodes.io returned HTTP ${response.status}; previous coordinates have been preserved.`);
 return parsePostcodesResponse(postcodes,await response.json());
}
export function applyLocations(rows:Initiative[],snapshot:LocationSnapshot){
 for(const r of rows){const location=snapshot.locations[postcodeKey(r.postcode)];if(r.fullPostcode&&location?.precision==='postcode'&&postcodeKey(location.label)===postcodeKey(r.postcode))r.location=location;}
 return rows;
}
