import {combineCoverageGroups,type CombinedCoverage} from './coverage';
import type {Coverage} from './types';
self.onmessage=(event:MessageEvent<{features:Coverage[];retained?:CombinedCoverage[]}>)=>{
 try{self.postMessage({features:combineCoverageGroups(event.data.features,event.data.retained)});}
 catch{self.postMessage({error:'The selected travel areas could not be combined. Individual areas remain available for inspection.'});}
};
