import { useEffect, useState } from 'react';
import type { TraceStep } from '../userTrace';
export function ExecutionTrace({ steps, source, stale, active, run, running }: { steps: TraceStep[]; source: string; stale: boolean; active: boolean; run: () => void; running: boolean }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { setIndex(0); setPlaying(false); }, [steps]);
  useEffect(() => { if (!active || stale) setPlaying(false); }, [active, stale]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setIndex(i => { if (i >= steps.length-1) { setPlaying(false); return i; } return i+1; }), 650);
    return () => clearInterval(timer);
  }, [playing, steps.length]);
  const step = steps[Math.min(index,steps.length-1)];
  return <div className="execution-trace">
    <div className="trace-intro"><span className="trace-eyebrow">YOUR CODE · CASE 1</span><h2>Execution, step by step.</h2><p>Inspect the state before each executed line, captured from your editor.</p><button className="btn" disabled={running} onClick={run}>{running ? 'Running your code…' : 'Run & visualize'}</button></div>
    {stale && steps.length > 0 && <p role="status" className="trace-notice">Code changed. Run again to update this recording.</p>}
    {!step ? <div className="empty-state">Run your solution to capture its execution.</div> : <>
      <div className="trace-controls"><button className="btn" onClick={() => { setPlaying(false); setIndex(Math.max(0,index-1)); }} disabled={index===0}>Previous</button><button className="btn" onClick={() => { if(index===steps.length-1) setIndex(0); setPlaying(!playing); }}>{playing ? 'Pause' : 'Play'}</button><button className="btn" onClick={() => { setPlaying(false); setIndex(Math.min(steps.length-1,index+1)); }} disabled={index===steps.length-1}>Next</button><span>{index+1} / {steps.length}</span></div>
      <input aria-label="Execution step" type="range" min="0" max={steps.length-1} value={index} onChange={e=>{setPlaying(false);setIndex(+e.target.value);}} />
      <pre className="trace-source">{source.split('\n').map((line,i)=><div key={i} className={i+1===step.line?'executing':''}><span>{i+1}</span>{line || ' '}</div>)}</pre>
      <div className="trace-state-title">Line {step.line} · {step.event} · Variables</div>
      <div className="trace-variables">{Object.entries(step.locals).map(([name,value])=><div className="trace-variable" key={name}><strong>{name}</strong>{Array.isArray(value) ? <div className="trace-array">{value.map((v,i)=><div key={i}><code>{JSON.stringify(v)}</code><small>{i}</small></div>)}</div> : <pre>{JSON.stringify(value,null,2)}</pre>}</div>)}</div>
      {steps.length>=500 && <p className="fine">Recording limited to 500 steps. Values are depth- and size-limited.</p>}
    </>}
  </div>;
}
