import type { Problem, TestCase } from './problems';
export type Result = {label:string;passed:boolean;input:string;expected:string;actual:string;error?:string};
export function evaluateCode(code:string, problem:Pick<Problem,'id'|'functionName'|'tests'>):Result[] {
 const fn=new Function(`${code}\n;return typeof ${problem.functionName} === 'function' ? ${problem.functionName} : null;`)();
 if(!fn)throw Error(`Define a function named ${problem.functionName}.`);
 return problem.tests.map((test:TestCase)=>{
  try {
   const args=structuredClone(test.args);
   if(problem.id==='reverse-list') args[0]=(args[0] as number[]).reduceRight<unknown>((next,val)=>({val,next}),null);
   let result=fn(...args);
   if(result instanceof Promise)throw Error('Return a value directly; async solutions are not supported.');
   if(problem.id==='reverse-list'){
    const values:unknown[]=[];const seen=new Set();
    while(result!==null){if(!result||typeof result!=='object'||!('val' in result)||!('next' in result))throw Error('Return a linked-list head with val and next, or null.');if(seen.has(result))throw Error('The returned linked list contains a cycle.');seen.add(result);values.push(result.val);if(values.length>10000)throw Error('Returned list is too long.');result=result.next;}result=values;
   }
   let passed=JSON.stringify(result)===JSON.stringify(test.expected);
   if(problem.id==='two-sum') {const nums=test.args[0] as number[];passed=Array.isArray(result)&&result.length===2&&result.every((i:unknown)=>Number.isInteger(i)&&Number(i)>=0&&Number(i)<nums.length)&&result[0]!==result[1]&&nums[result[0]]+nums[result[1]]===test.args[1];}
   return {label:test.label,passed,input:JSON.stringify(test.args),expected:JSON.stringify(test.expected),actual:JSON.stringify(result)??'undefined'};
  }catch(error){return {label:test.label,passed:false,input:JSON.stringify(test.args),expected:JSON.stringify(test.expected),actual:'Error',error:error instanceof Error?error.message:String(error)};}
 });
}
