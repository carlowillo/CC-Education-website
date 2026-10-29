import type {Initiative,Coverage} from '../src/types.ts';
import {eligible,toFeature} from './logic.ts';
export type TravelMode='driving'|'public_transport';
export class RoutingError extends Error{
 constructor(message:string,public status:number|null=null,public providerCode:number|null=null){super(message);}
}
export function arrivalRequest(row:Initiative,mode:TravelMode,arrival:string){
 if(!eligible(row))throw new Error('Coverage requires a resolved full postcode');
 return {arrival_searches:[{id:row.id,coords:{lat:row.location!.lat,lng:row.location!.lng},transportation:{type:mode},arrival_time:arrival,travel_time:2700}]};
}
export async function requestTravelArea(row:Initiative,mode:TravelMode,arrival:string,fetcher:typeof fetch=fetch):Promise<Coverage>{
 if(!process.env.TRAVELTIME_APP_ID||!process.env.TRAVELTIME_API_KEY)throw new RoutingError('TravelTime credentials are not configured.');
 let response:Response;
 try{response=await fetcher('https://api.traveltimeapp.com/v4/time-map',{method:'POST',headers:{'Content-Type':'application/json','X-Application-Id':process.env.TRAVELTIME_APP_ID,'X-Api-Key':process.env.TRAVELTIME_API_KEY},body:JSON.stringify(arrivalRequest(row,mode,arrival)),signal:AbortSignal.timeout(45000)});}
 catch{throw new RoutingError('TravelTime could not be reached through the configured network route.');}
 if(!response.ok){
  let code:null|number=null;
  try{const body=await response.json();if(Number.isFinite(body.error_code))code=body.error_code;}catch{}
  const reason=response.status===401?'TravelTime rejected authentication. Check the existing application ID and API key.':response.status===403?'TravelTime denied access. Check the provider account, service permissions and destination access.':response.status===429?'TravelTime rate limit reached. Retry after the provider quota resets.':`TravelTime returned HTTP ${response.status}. Check provider date, location and mode support.`;
  throw new RoutingError(reason,response.status,code);
 }
 const body=await response.json();
 const result=body.results?.find((v:{search_id:string})=>v.search_id===row.id);
 if(!Array.isArray(result?.shapes)||!result.shapes.length)throw new RoutingError('TravelTime returned no area for this location, travel mode and arrival time.');
 return toFeature(row,result.shapes,mode,arrival);
}
