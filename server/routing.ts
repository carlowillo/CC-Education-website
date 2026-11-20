import type {Initiative,Coverage} from '../src/types.ts';
import {eligible,toFeature} from './logic.ts';
export type TravelMode='driving'|'public_transport';
export class RoutingError extends Error{
 constructor(message:string,public status:number|null=null,public providerCode:number|null=null){super(message);}
}
export function arrivalRequest(row:Initiative,mode:TravelMode,arrival:string){
 if(!eligible(row,true))throw new Error('Coverage requires a resolved or explicitly estimated postcode');
 return {arrival_searches:[{id:row.id,coords:{lat:row.location!.lat,lng:row.location!.lng},transportation:{type:mode},arrival_time:arrival,travel_time:2700}]};
}
export async function requestTravelAreas(rows:Initiative[],mode:TravelMode,arrival:string,fetcher:typeof fetch=fetch):Promise<Coverage[]>{
 if(!rows.length||rows.length>5)throw new Error('Use between one and five locations per routing batch.');
 if(!process.env.TRAVELTIME_APP_ID||!process.env.TRAVELTIME_API_KEY)throw new RoutingError('TravelTime credentials are not configured.');
 const body={arrival_searches:rows.flatMap(row=>arrivalRequest(row,mode,arrival).arrival_searches)};
 let response:Response;
 try{response=await fetcher('https://api.traveltimeapp.com/v4/time-map',{method:'POST',headers:{'Content-Type':'application/json','X-Application-Id':process.env.TRAVELTIME_APP_ID,'X-Api-Key':process.env.TRAVELTIME_API_KEY},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});}
 catch{throw new RoutingError('TravelTime could not be reached through the configured network route.');}
 if(!response.ok){
  let code:null|number=null;
  try{const body=await response.json();if(Number.isFinite(body.error_code))code=body.error_code;}catch{}
  const reason=response.status===401?'TravelTime rejected authentication. Check the existing application ID and API key.':response.status===403?'TravelTime denied access. Check the provider account, service permissions and destination access.':response.status===429?'TravelTime rate limit reached. Retry after the provider quota resets.':`TravelTime returned HTTP ${response.status}. Check provider date, location and mode support.`;
  throw new RoutingError(reason,response.status,code);
 }
 const data=await response.json();
 return rows.map(row=>{
  const result=data.results?.find((v:{search_id:string})=>v.search_id===row.id);
  if(!Array.isArray(result?.shapes)||!result.shapes.length)throw new RoutingError(`TravelTime returned no area for ${row.name}, this travel mode and arrival time.`,response.status);
  return toFeature(row,result.shapes,mode,arrival);
 });
}
export async function requestTravelArea(row:Initiative,mode:TravelMode,arrival:string,fetcher:typeof fetch=fetch):Promise<Coverage>{
 return (await requestTravelAreas([row],mode,arrival,fetcher))[0];
}
