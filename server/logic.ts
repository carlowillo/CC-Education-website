import type { Initiative, Coverage } from '../src/types.ts';
export function eligible(r: Initiative) { return r.fullPostcode && r.location?.precision === 'postcode'; }
type Point = {lat: number; lng: number};
export function toFeature(r: Initiative, shapes: {shell: Point[]; holes: Point[][]}[], mode: string, arrival: string): Coverage {
  const ring = (points: Point[]) => {
    if (points.length < 3 || points.some(p => !Number.isFinite(p.lat) || !Number.isFinite(p.lng))) throw new Error('Invalid routing geometry');
    const result = points.map(p => [p.lng, p.lat]);
    if (result[0][0] !== result.at(-1)![0] || result[0][1] !== result.at(-1)![1]) result.push([...result[0]]);
    return result;
  };
  return {type: 'Feature', properties: {id:r.id, name:r.name, mode, arrival, minutes:45}, geometry: {type:'MultiPolygon', coordinates:shapes.map(s=>[ring(s.shell), ...(s.holes || []).map(ring)])}};
}
// Interpret a wall-clock time in London, including British Summer Time.
export function londonToISO(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Choose a valid arrival time');
  const wall = Date.parse(value+'Z');
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0,16)!==value) throw new Error('Invalid arrival time');
  const offset = (t:number) => new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',timeZoneName:'longOffset'}).formatToParts(t).find(p=>p.type==='timeZoneName')!.value.includes('+01:00') ? 3600000 : 0;
  const actual = wall - offset(wall);
  if (actual + offset(actual) !== wall) throw new Error('This London time does not exist due to the clock change');
  return new Date(actual).toISOString();
}
