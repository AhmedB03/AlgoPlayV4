import { useEffect, useState } from 'react';
import { SquareCheck, Terminal } from 'lucide-react';
import type { Problem } from '../problems';
import type { Result } from '../judge';
import { paramNames, show } from '../format';

export type Verdict = 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Compile Error' | 'Time Limit Exceeded';

export type RunState = {
  mode: 'Run' | 'Submit';
  running: boolean;
  results: Result[];
  verdict?: Verdict;
  error?: string;
  runtime?: number;
};

export const SAMPLE_COUNT = 2;

function Params({ problem, args }: { problem: Problem; args: unknown[] }) {
  const names = paramNames(problem);
  return (
    <>
      {args.map((arg, i) => (
        <div className="io-block" key={i}>
          <label>{names[i] ?? `arg${i + 1}`} =</label>
          <code>{show(arg)}</code>
        </div>
      ))}
    </>
  );
}

type Props = {
  problem: Problem;
  run: RunState | null;
  tab: 'testcase' | 'result';
  onTab: (tab: 'testcase' | 'result') => void;
};

export function Console({ problem, run, tab, onTab }: Props) {
  const [sampleCase, setSampleCase] = useState(0);
  const [resultCase, setResultCase] = useState(0);
  const samples = problem.tests.slice(0, SAMPLE_COUNT);

  useEffect(() => { setSampleCase(0); }, [problem.id]);
  useEffect(() => {
    // Jump to the first failing case, like LeetCode does.
    const firstFail = run?.results.findIndex(r => !r.passed) ?? -1;
    setResultCase(firstFail >= 0 ? firstFail : 0);
  }, [run]);

  const results = run?.results ?? [];
  const passCount = results.filter(r => r.passed).length;
  const selected = results[resultCase];

  return (
    <section className="panel console-panel" aria-label="Test console">
      <div className="panel-tabs">
        <button className={tab === 'testcase' ? 'active' : ''} onClick={() => onTab('testcase')}>
          <SquareCheck size={14} className="text-success" />Testcase
        </button>
        <span className="tab-divider" />
        <button className={tab === 'result' ? 'active' : ''} onClick={() => onTab('result')}>
          <Terminal size={14} className="text-success" />Test Result
        </button>
      </div>

      <div className="console-body">
        {tab === 'testcase' ? (
          <>
            <div className="case-tabs">
              {samples.map((t, i) => (
                <button key={t.label} className={`case-tab ${i === sampleCase ? 'active' : ''}`} onClick={() => setSampleCase(i)} title={t.label}>
                  Case {i + 1}
                </button>
              ))}
            </div>
            <Params problem={problem} args={samples[sampleCase].args} />
            <p className="fine">Run checks these {samples.length} cases. Submit checks all {problem.tests.length}.</p>
          </>
        ) : !run ? (
          <p className="console-empty">You must run your code first.</p>
        ) : run.running ? (
          <div className="console-running"><span className="spinner" />Running…</div>
        ) : run.error ? (
          <>
            <div className="verdict error">{run.verdict}</div>
            <pre className="error-box" role="alert">{run.error}</pre>
          </>
        ) : (
          <>
            <div className="verdict-row">
              <div className={`verdict ${run.verdict === 'Accepted' ? 'success' : 'error'}`}>{run.verdict}</div>
              <span className="fine">
                {run.mode === 'Submit' ? `${passCount} / ${results.length} testcases passed` : `Runtime: ${Math.max(0, Math.round(run.runtime ?? 0))} ms`}
              </span>
            </div>
            <div className="case-tabs">
              {results.map((r, i) => (
                <button key={i} className={`case-tab ${i === resultCase ? 'active' : ''}`} onClick={() => setResultCase(i)} title={r.label}>
                  <span className={`case-dot ${r.passed ? 'pass' : 'fail'}`} />Case {i + 1}
                </button>
              ))}
            </div>
            {selected && (
              <>
                <div className="io-section">Input</div>
                <Params problem={problem} args={problem.tests[resultCase].args} />
                <div className="io-section">Output</div>
                <div className={`io-block ${selected.passed ? '' : 'wrong'}`}><code>{selected.error ?? selected.actual}</code></div>
                <div className="io-section">Expected</div>
                <div className="io-block"><code>{selected.expected}</code></div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
