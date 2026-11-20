import type { Feature, MultiPolygon } from 'geojson';
export type Initiative = {
  id: string; name: string; postcode: string; website: string | null;
  organisation: string; support: string; provision: string; stage: string;
  stageDetail: string; ethos: string; ethosInferred: boolean; fullPostcode: boolean;
  location: {lat: number; lng: number; precision: string; label: string; source: string; referenceArea?:string; estimateBasis?:string} | null;
};
export type StageGroup='open'|'developing'|'unknown';
export const stageGroup=(stage:string):StageGroup=>stage==='Open'?'open':stage==='Not recorded'?'unknown':'developing';
export const stageLabels:Record<StageGroup,string>={open:'Open',developing:'In development',unknown:'Stage not recorded'};
export const stageColours:Record<StageGroup,string>={open:'#783cbd',developing:'#c76300',unknown:'#626b79'};
export type Coverage = Feature<MultiPolygon, {id: string; name: string; mode: string; arrival: string; minutes: number; stageGroup?:StageGroup; locationBasis?:'postcode'|'estimated'; routingPostcode?:string}>;
export const ethosLabels: Record<string, string> = {fully: 'Fully Christian ethos', strong: 'Strong Christian ethos', unclassified: 'Needs classification'};
