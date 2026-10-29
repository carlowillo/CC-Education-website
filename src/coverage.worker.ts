import {combineCoverage} from './coverage';
import type {Coverage} from './types';
self.onmessage=(event:MessageEvent<{features:Coverage[]}>)=>{
 try{self.postMessage({feature:combineCoverage(event.data.features)});}
 catch{self.postMessage({error:'The selected travel areas could not be combined. Individual areas remain available for inspection.'});}
};
