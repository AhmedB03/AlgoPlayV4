import { Fragment, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  BookOpen, ChevronDown, ChevronLeft, ChevronRight, CircleCheckBig, CircleHelp, CirclePlay, CloudUpload, CodeXml,
  FileText, History, Lightbulb, List, Moon, Play, RotateCcw, Shuffle, Sun, Tag, X,
} from 'lucide-react';
import { problems, type Problem } from './problems';
import type { Result } from './judge';
import { read, save } from './storage';
import { paramNames, show, timeAgo } from './format';
import { Visualizer } from './components/Visualizer';
import { ProblemList, difficultyClass } from './components/ProblemList';
import { Console, SAMPLE_COUNT, type RunState, type Verdict } from './components/Console';
import { Gutter } from './components/Gutter';
import './styles.css';

const Editor = lazy(() => import('./components/Editor'));

type Theme = 'dark' | 'light';
type LeftTab = 'description' | 'editorial' | 'visualizer' | 'submissions';
type Submission = { at: number; verdict: Verdict; passed: number; total: number; runtime?: number };

const TIME_LIMIT_MS = 3000;
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

const hashId = () => location.hash.slice(1);
const isProblemId = (id: string) => problems.some(p => p.id === id);

/** Wraps parameter names and a few literals in <code>, the way LeetCode formats statements. */
function RichText({ text, names }: { text: string; names: string[] }) {
  const words = [...names, 'val', 'next', 'null', 'true', 'false'].map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(?<![\\w'’])(${words.join('|')})(?![\\w'’])`, 'g'));
  return <>{parts.map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}</>;
}

function Examples({ problem }: { problem: Problem }) {
  const names = paramNames(problem);
  const extra = problem.tests.slice(1, 3).map(t => ({
    input: t.args.map((a, i) => `${names[i] ?? `arg${i + 1}`} = ${show(a)}`).join(', '),
    output: show(t.expected),
  }));
  const all = [{ input: problem.example, output: problem.output, explanation: problem.explanation }, ...extra];
  return (
    <>
      {all.map((ex, i) => (
        <Fragment key={i}>
          <p className="example-title">Example {i + 1}:</p>
          <div className="example">
            <p><b>Input:</b> <span>{ex.input}</span></p>
            <p><b>Output:</b> <span>{ex.output}</span></p>
            {'explanation' in ex && ex.explanation && <p><b>Explanation:</b> <span>{ex.explanation}</span></p>}
          </div>
        </Fragment>
      ))}
    </>
  );
}

function Accordion({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`accordion ${open ? 'open' : ''}`}>
      <button onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{icon}{title}</span>
        <ChevronDown size={16} />
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}

export default function App() {
  const [id, setId] = useState(() => (isProblemId(hashId()) ? hashId() : problems[0].id));
  const [page, setPage] = useState<'workspace' | 'problems'>(() => (isProblemId(hashId()) ? 'workspace' : 'problems'));
  const problem = problems.find(p => p.id === id)!;
  const index = problems.indexOf(problem);

  const [theme, setTheme] = useState<Theme>(() => read('algoplay-theme', 'dark'));
  const [codes, setCodes] = useState<Record<string, string>>(() => read('algoplay-code', {}));
  const [solved, setSolved] = useState<string[]>(() => read('algoplay-solved', []));
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>(() => read('algoplay-submissions', {}));
  const [split, setSplit] = useState(() => read('algoplay-split', { x: 44, y: 60 }));

  const [leftTab, setLeftTab] = useState<LeftTab>('description');
  const [drawer, setDrawer] = useState(false);
  const [guide, setGuide] = useState(false);
  const [focus, setFocus] = useState(false);
  const [playToken, setPlayToken] = useState(0);
  const [run, setRun] = useState<RunState | null>(null);
  const [consoleTab, setConsoleTab] = useState<'testcase' | 'result'>('testcase');

  const worker = useRef<Worker | null>(null);
  const runTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guideRef = useRef<HTMLDialogElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const code = codes[id] ?? problem.starter;
  const names = paramNames(problem);
  const attempted = Object.keys(submissions).filter(k => submissions[k].length && !solved.includes(k));

  useEffect(() => { save('algoplay-code', codes); }, [codes]);
  useEffect(() => { save('algoplay-solved', solved); }, [solved]);
  useEffect(() => { save('algoplay-submissions', submissions); }, [submissions]);
  useEffect(() => { save('algoplay-split', split); }, [split]);
  useEffect(() => {
    save('algoplay-theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => { document.title = page === 'workspace' ? `${problem.number}. ${problem.title} · AlgoPlay` : 'Problems · AlgoPlay'; }, [page, problem]);

  useEffect(() => {
    const onHash = () => {
      const next = hashId();
      if (isProblemId(next)) select(next);
      else setPage('problems');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  });

  useEffect(() => () => cancelRun(), []);
  useEffect(() => {
    if (guide) guideRef.current?.showModal();
    else guideRef.current?.close();
  }, [guide]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  function cancelRun() {
    worker.current?.terminate();
    worker.current = null;
    if (runTimer.current) clearTimeout(runTimer.current);
  }

  /** Stops any in-flight run when navigating away, so the console never stays stuck on "Running…". */
  function stopRun() {
    cancelRun();
    setRun(r => (r?.running ? null : r));
  }

  function select(next: string) {
    stopRun();
    setDrawer(false);
    setPage('workspace');
    setFocus(false);
    if (next !== id) {
      setId(next);
      setPlayToken(0);
      setRun(null);
      setConsoleTab('testcase');
      setLeftTab('description');
    }
    if (hashId() !== next) location.hash = next;
  }

  function showProblems() {
    stopRun();
    setPage('problems');
    history.pushState(null, '', location.pathname + location.search);
  }

  function execute(submit: boolean) {
    cancelRun();
    const mode = submit ? 'Submit' : 'Run';
    const tests = submit ? problem.tests : problem.tests.slice(0, SAMPLE_COUNT);
    const pid = problem.id;
    setRun({ mode, running: true, results: [] });
    setConsoleTab('result');

    const finish = (state: { results: Result[]; verdict: Verdict; error?: string; runtime?: number }) => {
      cancelRun();
      setRun({ mode, running: false, ...state });
      if (!submit) return;
      const passed = state.results.filter(r => r.passed).length;
      const entry: Submission = { at: Date.now(), verdict: state.verdict, passed, total: tests.length, runtime: state.runtime };
      setSubmissions(s => ({ ...s, [pid]: [entry, ...(s[pid] ?? [])].slice(0, 20) }));
      if (state.verdict === 'Accepted') setSolved(s => (s.includes(pid) ? s : [...s, pid]));
    };

    const w = new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    runTimer.current = setTimeout(() => finish({
      results: [],
      verdict: 'Time Limit Exceeded',
      error: `Your code ran longer than ${TIME_LIMIT_MS / 1000} seconds. Check for an infinite loop.`,
    }), TIME_LIMIT_MS);
    w.onmessage = ({ data }) => {
      if (data.error) {
        finish({ results: [], verdict: data.errorName === 'SyntaxError' ? 'Compile Error' : 'Runtime Error', error: data.error });
        return;
      }
      const results: Result[] = data.results;
      const verdict: Verdict = results.every(r => r.passed) ? 'Accepted' : results.some(r => r.error) ? 'Runtime Error' : 'Wrong Answer';
      finish({ results, verdict, runtime: data.runtime });
    };
    w.onerror = e => {
      e.preventDefault();
      finish({ results: [], verdict: 'Runtime Error', error: e.message || 'Could not run your code.' });
    };
    w.postMessage({ code, problem: { id: pid, functionName: problem.functionName, tests } });
  }

  // Keep the latest execute() reachable from stable keyboard handlers.
  const executeRef = useRef(execute);
  executeRef.current = execute;

  useEffect(() => {
    if (page !== 'workspace') return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.defaultPrevented) return;
      if (e.key === 'Enter') { e.preventDefault(); executeRef.current(true); }
      if (e.key === "'") { e.preventDefault(); executeRef.current(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page]);

  const running = run?.running ?? false;
  const problemSubs = submissions[id] ?? [];

  const tabs: { key: LeftTab; label: string; icon: ReactNode }[] = [
    { key: 'description', label: 'Description', icon: <FileText size={14} className="tab-icon-blue" /> },
    { key: 'editorial', label: 'Editorial', icon: <BookOpen size={14} className="tab-icon-orange" /> },
    { key: 'visualizer', label: 'Visualizer', icon: <CirclePlay size={14} className="tab-icon-green" /> },
    { key: 'submissions', label: 'Submissions', icon: <History size={14} className="tab-icon-blue" /> },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className={`app ${page === 'workspace' ? 'workspace-page' : ''}`}>
        <header className="topbar">
          <div className="topbar-left">
            <a href="#" className="brand" onClick={e => { e.preventDefault(); showProblems(); }} aria-label="AlgoPlay home">
              <span className="brand-mark"><Play size={14} fill="currentColor" /></span>
              <span className="brand-name">AlgoPlay</span>
            </a>
            {page === 'workspace' ? (
              <>
                <span className="topbar-divider" />
                <button className="nav-btn" onClick={() => setDrawer(true)}><List size={16} /><span>Problem List</span></button>
                <button className="icon-btn" aria-label="Previous problem" title="Previous problem" onClick={() => select(problems[(index - 1 + problems.length) % problems.length].id)}><ChevronLeft size={16} /></button>
                <button className="icon-btn" aria-label="Next problem" title="Next problem" onClick={() => select(problems[(index + 1) % problems.length].id)}><ChevronRight size={16} /></button>
                <button className="icon-btn hide-sm" aria-label="Random problem" title="Random problem" onClick={() => select(problems[Math.floor(Math.random() * problems.length)].id)}><Shuffle size={15} /></button>
              </>
            ) : (
              <nav aria-label="Main navigation">
                <button className="nav-link active">Problems</button>
                <button className="nav-link" onClick={() => select(id)}>Playground</button>
              </nav>
            )}
          </div>

          {page === 'workspace' && (
            <div className="run-group">
              <button className="run-btn" disabled={running} onClick={() => execute(false)} title={`Run (${mod} + ')`}>
                <Play size={14} fill="currentColor" /><span>Run</span>
              </button>
              <button className="submit-btn" disabled={running} onClick={() => execute(true)} title={`Submit (${mod} + Enter)`}>
                <CloudUpload size={15} /><span>Submit</span>
              </button>
            </div>
          )}

          <div className="topbar-right">
            <span className="solved-chip" title="Problems solved in this browser">
              <CircleCheckBig size={14} />{solved.length}/{problems.length}
            </span>
            <button className="icon-btn" aria-label="Quick guide" title="Quick guide" onClick={() => setGuide(true)}><CircleHelp size={17} /></button>
            <button className="icon-btn" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <span className="avatar" aria-label="Local learner profile">AP</span>
          </div>
        </header>

        {page === 'problems' ? (
          <ProblemList solved={solved} attempted={attempted} onSelect={select} />
        ) : (
          <main className={`workspace ${focus ? 'focus' : ''}`} ref={workspaceRef}>
            <section className="panel left-panel" style={{ flexBasis: `${split.x}%` }}>
              <div className="panel-tabs" role="tablist" aria-label="Problem views">
                {tabs.map((t, i) => (
                  <Fragment key={t.key}>
                    {i > 0 && <span className="tab-divider" />}
                    <button role="tab" aria-selected={leftTab === t.key} className={leftTab === t.key ? 'active' : ''} onClick={() => setLeftTab(t.key)}>
                      {t.icon}{t.label}
                    </button>
                  </Fragment>
                ))}
              </div>

              <div className="panel-body description" hidden={leftTab !== 'description'}>
                <h1 className="problem-title">{problem.number}. {problem.title}</h1>
                <div className="tags">
                  <span className={`tag ${difficultyClass(problem.difficulty)}`}>{problem.difficulty}</span>
                  <span className="tag"><Tag size={12} />{problem.category}</span>
                  {solved.includes(id) && <span className="solved-mark">Solved <CircleCheckBig size={15} /></span>}
                </div>
                <p className="statement"><RichText text={problem.detail} names={names} /></p>
                <Examples problem={problem} />
                <p className="example-title">Constraints:</p>
                <ul className="constraints">
                  {problem.constraints.map(c => <li key={c}><code>{c}</code></li>)}
                </ul>
                <div className="accordions">
                  <Accordion icon={<Tag size={14} />} title="Topics">
                    <span className="tag">{problem.category}</span>
                  </Accordion>
                  <Accordion icon={<Lightbulb size={14} />} title="Hint 1">
                    <p>{problem.hint}</p>
                  </Accordion>
                  <Accordion icon={<CirclePlay size={14} />} title="See it animated">
                    <p>The Visualizer tab walks through the reference solution step by step. You can pause, scrub, and edit the input.</p>
                    <button className="btn" onClick={() => setLeftTab('visualizer')}>Open Visualizer</button>
                  </Accordion>
                </div>
              </div>

              <div className="panel-body editorial" hidden={leftTab !== 'editorial'}>
                <h2>Approach: {problem.category}</h2>
                <h3>Intuition</h3>
                <p>{problem.hint}</p>
                <div className="callout">
                  <Lightbulb size={16} />
                  <p>{problem.analogy}</p>
                </div>
                <h3>Algorithm</h3>
                <ol className="recipe">{problem.pseudocode.map(s => <li key={s}>{s}</li>)}</ol>
                <h3>Implementation</h3>
                <pre className="solution-code"><code>{problem.solution}</code></pre>
                <h3>Complexity Analysis</h3>
                <ul className="complexity">
                  <li><b>Time complexity:</b> <code>{problem.complexity[0]}</code></li>
                  <li><b>Space complexity:</b> <code>{problem.complexity[1]}</code> extra space</li>
                </ul>
              </div>

              <div className="panel-body flush" hidden={leftTab !== 'visualizer'}>
                <Visualizer
                  key={problem.id}
                  problem={problem}
                  active={leftTab === 'visualizer'}
                  playToken={playToken}
                  focused={focus}
                  onToggleFocus={() => setFocus(!focus)}
                />
              </div>

              <div className="panel-body" hidden={leftTab !== 'submissions'}>
                {problemSubs.length ? (
                  <table className="subs-table">
                    <thead><tr><th>Status</th><th>Tests</th><th>Runtime</th><th>When</th></tr></thead>
                    <tbody>
                      {problemSubs.map(s => (
                        <tr key={s.at}>
                          <td className={s.verdict === 'Accepted' ? 'text-success' : 'text-error'}><b>{s.verdict}</b></td>
                          <td>{s.passed} / {s.total}</td>
                          <td>{s.runtime === undefined ? 'N/A' : `${Math.max(0, Math.round(s.runtime))} ms`}</td>
                          <td className="muted">{timeAgo(s.at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <History size={28} />
                    <p>No submissions yet.</p>
                    <small>Press Submit to run the full test suite. Your history is kept in this browser.</small>
                  </div>
                )}
              </div>
            </section>

            <Gutter axis="x" container={workspaceRef} value={split.x} min={25} max={70} label="Resize problem and editor panes" onChange={x => setSplit(s => ({ ...s, x }))} />

            <div className="right-col" ref={rightRef}>
              <section className="panel code-panel" style={{ flexBasis: `${split.y}%` }}>
                <div className="panel-tabs">
                  <button className="active"><CodeXml size={15} className="text-success" />Code</button>
                </div>
                <div className="editor-toolbar">
                  <span className="lang-pill">JavaScript</span>
                  <div>
                    <button className="text-btn" onClick={() => { setCodes(s => ({ ...s, [id]: problem.solution })); }} title="Replace your code with the reference solution">
                      <Lightbulb size={13} />Load solution
                    </button>
                    <button className="icon-btn" aria-label="Reset code to starter" title="Reset to starter code" onClick={() => setCodes(s => ({ ...s, [id]: problem.starter }))}>
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
                <div className="editor-wrap">
                  <Suspense fallback={<div className="editor-loading">Loading editor…</div>}>
                    <Editor
                      value={code}
                      dark={theme === 'dark'}
                      onChange={v => setCodes(s => ({ ...s, [id]: v }))}
                      onRun={() => execute(false)}
                      onSubmit={() => execute(true)}
                    />
                  </Suspense>
                </div>
                <div className="editor-footer">
                  <span>Saved</span>
                  <span className="hide-sm"><kbd>{mod}</kbd> <kbd>'</kbd> Run · <kbd>{mod}</kbd> <kbd>Enter</kbd> Submit</span>
                </div>
              </section>

              <Gutter axis="y" container={rightRef} value={split.y} min={20} max={85} label="Resize editor and console" onChange={y => setSplit(s => ({ ...s, y }))} />

              <Console problem={problem} run={run} tab={consoleTab} onTab={setConsoleTab} />
            </div>
          </main>
        )}

        <AnimatePresence>
          {drawer && (
            <>
              <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
              <motion.aside
                className="drawer"
                role="dialog"
                aria-label="Problem list"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
              >
                <div className="drawer-head">
                  <button className="drawer-title" onClick={showProblems}>Foundation Collection <ChevronRight size={16} /></button>
                  <button className="icon-btn" aria-label="Close problem list" onClick={() => setDrawer(false)} autoFocus><X size={17} /></button>
                </div>
                <div className="drawer-progress">
                  <span>{solved.length}/{problems.length} Solved</span>
                  <div className="progress-track"><span style={{ width: `${(solved.length / problems.length) * 100}%` }} /></div>
                </div>
                <div className="drawer-list">
                  {problems.map(p => (
                    <button key={p.id} className={`drawer-row ${p.id === id ? 'current' : ''}`} onClick={() => select(p.id)}>
                      <span className="status-cell">
                        {solved.includes(p.id) ? <CircleCheckBig size={15} className="text-success" /> : attempted.includes(p.id) ? <span className="attempted" /> : null}
                      </span>
                      <span className="drawer-row-title">{p.number}. {p.title}</span>
                      <span className={difficultyClass(p.difficulty)}>{p.difficulty}</span>
                    </button>
                  ))}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <dialog ref={guideRef} onCancel={() => setGuide(false)} onClick={e => { if (e.target === e.currentTarget) setGuide(false); }}>
          <div className="dialog-heading">
            <h2>How AlgoPlay works</h2>
            <button className="icon-btn" aria-label="Close guide" onClick={() => setGuide(false)}><X size={18} /></button>
          </div>
          <ol className="guide-steps">
            <li><b>Read the problem</b><p>Description has the examples and constraints. Editorial explains the approach and complexity.</p></li>
            <li><b>Watch it run</b><p>The Visualizer tab animates the reference solution. Pause, scrub, change speed, or edit the input.</p></li>
            <li><b>Write your solution</b><p><b>Run</b> ({mod} + ') checks the sample cases. <b>Submit</b> ({mod} + Enter) checks the full suite and records the result under Submissions.</p></li>
          </ol>
          <div className="guide-note">Your code, submissions, and solved problems are saved in this browser. No account needed. Linked-list tests use real nodes with <code>val</code> and <code>next</code>.</div>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setGuide(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => { setGuide(false); if (page !== 'workspace') select(id); setLeftTab('visualizer'); setPlayToken(t => t + 1); }}>
              <Play size={14} fill="currentColor" />Watch a demo
            </button>
          </div>
        </dialog>
      </div>
    </MotionConfig>
  );
}
