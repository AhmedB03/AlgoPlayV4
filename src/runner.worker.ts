import { evaluateCode } from './judge';
self.onmessage=({data})=>{try{self.postMessage({results:evaluateCode(data.code,data.problem)});}catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}};
