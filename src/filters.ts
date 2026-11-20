import type {Initiative} from './types';
export type FilterKey='ethos'|'stage'|'provision'|'support'|'organisation';
export type Filters=Record<FilterKey,string[]>;
export const defaultFilters=():Filters=>({ethos:[],stage:['Open'],provision:[],support:[],organisation:[]});
export function matchesFilters(row:Initiative,filters:Filters,except?:FilterKey){
 return (Object.keys(filters) as FilterKey[]).every(key=>key===except||!filters[key].length||filters[key].includes(row[key]));
}
// Facet counts apply all other groups. Options within a group are alternatives
// (OR); different groups narrow one another (AND).
export function facetCounts(rows:Initiative[],filters:Filters,key:FilterKey):Record<string,number>{
 const counts:Record<string,number>={};
 for(const row of rows){counts[row[key]]??=0;if(matchesFilters(row,filters,key))counts[row[key]]++;}
 return counts;
}
