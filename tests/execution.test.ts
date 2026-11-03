import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { problems } from '../src/problems';
import { pythonSolutions } from '../src/languages';
import { instrument, snapshot } from '../src/userTrace';
import { evaluateCode } from '../src/judge';
describe('user JavaScript tracing', () => {
  for (const p of problems) it(`preserves ${p.title} results`, () => {
    const seen: unknown[] = [];
    (globalThis as any).__capture = (_line:number, vars:Record<string,()=>unknown>) => {
      const row: Record<string,unknown> = {}; for (const [k,get] of Object.entries(vars)) { try { row[k]=snapshot(get()); } catch {} } seen.push(row);
    };
    expect(evaluateCode(instrument(p.solution,'__capture'),p).every(r=>r.passed)).toBe(true);
    expect(seen.length).toBeGreaterThan(0);
    delete (globalThis as any).__capture;
  });
  it('records custom variables from an incorrect solution', () => {
    const rows: unknown[]=[];
    (globalThis as any).__capture=(_n:number,v:Record<string,()=>unknown>)=>{try{rows.push(v.custom());}catch{}};
    const result=evaluateCode(instrument('function twoSum(nums,target) { let custom = 123; custom += 7; return []; }','__capture'),problems[0]);
    expect(result[0].passed).toBe(false); expect(rows).toContain(123); expect(rows).toContain(130);
    delete (globalThis as any).__capture;
  });
});
describe('Python execution and tracing', () => {
  const runner=readFileSync(new URL('../src/pythonRunner.py',import.meta.url),'utf8');
  function run(code:string,problem:typeof problems[number]) {
    const payload=JSON.stringify({code,problem});
    const script=`payload_json = ${JSON.stringify(payload)}\n`+runner.replace('json.dumps(run_submission(json.loads(payload_json)))','print(json.dumps(run_submission(json.loads(payload_json))))');
    const proc=spawnSync(process.env.PYTHON ?? 'python',['-c',script],{encoding:'utf8',timeout:10000});
    if(proc.status!==0) throw Error(proc.stderr || String(proc.error));
    return JSON.parse(proc.stdout);
  }
  for (const p of problems) it(`${p.title} accepts Python and records source lines`,()=>{
    const result=run(pythonSolutions[p.id],p);
    expect(result.results.every((r:any)=>r.passed)).toBe(true);
    expect(result.steps.length).toBeGreaterThan(1);
  });
  it('records a wrong implementation rather than the reference answer',()=>{
    const result=run('def twoSum(nums, target):\n    marker = 123\n    marker += 7\n    return []',problems[0]);
    expect(result.results[0].passed).toBe(false);
    expect(result.steps.some((s:any)=>s.locals.marker===130)).toBe(true);
  });
  it('returns errors and bounds recordings',()=>{
    const result=run('def twoSum(nums, target):\n    for i in range(1000):\n        marker = i\n    raise ValueError("custom failure")',problems[0]);
    expect(result.steps.length).toBe(500); expect(result.results[0].error).toContain('custom failure');
  });
});
