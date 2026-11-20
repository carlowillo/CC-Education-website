import type {Initiative} from './types';
export type EstimatedLocations={version:1;resolvedAt:string;locations:Record<string,{sourcePostcode:string;location:NonNullable<Initiative['location']>}>;failures:Record<string,string>};
export const isPrecise=(row:Initiative)=>row.fullPostcode&&row.location?.precision==='postcode';
export function canRoute(row:Initiative,includeEstimated=false){
 const loc=row.location;
 return Boolean(loc&&Number.isFinite(loc.lat)&&Number.isFinite(loc.lng)&&loc.lat>=49&&loc.lat<=62&&loc.lng>=-9&&loc.lng<=3&&(isPrecise(row)||includeEstimated&&loc.precision==='estimated'&&/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(loc.label)));
}
export function applyEstimatedLocations(rows:Initiative[],snapshot:EstimatedLocations){
 for(const row of rows){
  const entry=snapshot.locations[row.id];
  if(row.fullPostcode||!entry||entry.sourcePostcode!==row.postcode||entry.location.precision!=='estimated')continue;
  if(canRoute({...row,location:entry.location},true))row.location=entry.location;
 }
 return rows;
}
