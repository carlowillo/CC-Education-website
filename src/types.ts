import type { Feature, MultiPolygon } from 'geojson';
export type Initiative = {
  id: string; name: string; postcode: string; website: string | null;
  organisation: string; support: string; provision: string; stage: string;
  stageDetail: string; ethos: string; ethosInferred: boolean; fullPostcode: boolean;
  location: {lat: number; lng: number; precision: string; label: string; source: string} | null;
};
export type Coverage = Feature<MultiPolygon, {id: string; name: string; mode: string; arrival: string; minutes: number}>;
export const ethosLabels: Record<string, string> = {fully: 'Fully Christian ethos', strong: 'Strong Christian ethos', unclassified: 'Needs classification'};
