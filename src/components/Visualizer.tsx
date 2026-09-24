import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Braces, Check, ChevronRight, Maximize2, Minimize2, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from 'lucide-react';
import type { Problem } from '../problems';
import { buildFrames, type Frame, type VisualNode } from '../traces';
import { patternName } from '../format';

// Traces use this hex for secondary pointers; the scene maps it to a theme token.
const SECONDARY_POINTER = '#9cacf9';
const pointerColor = (color?: string) => (!color ? 'var(--viz-pointer)' : color === SECONDARY_POINTER ? 'var(--viz-secondary)' : color);

function Scene({ frame, problem, speed }: { frame: Frame; problem: Problem; speed: number }) {
  const graph = problem.id === 'graph-bfs';
  return (
    <svg className="scene" viewBox="0 0 700 285" role="img" aria-label={`${problem.title} animation: ${frame.title}. ${frame.text}`}>
      <defs>
        <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" className="grid-dot" />
        </pattern>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8" className="marker" />
        </marker>
        <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8" className="marker active" />
        </marker>
      </defs>
      <rect width="700" height="285" fill="url(#grid)" />
      {problem.id === 'parentheses' && (
        <>
          <path d="M302 155V252H398V155" className="stack-outline" />
          <text x="350" y="275" className="svg-caption" textAnchor="middle">STACK</text>
        </>
      )}
      <AnimatePresence>
        {frame.edges.map(e => {
          const a = frame.nodes.find(n => n.id === e.from);
          const b = frame.nodes.find(n => n.id === e.to);
          if (!a || !b) return null;
          const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1, r = graph ? 27 : 33;
          const x1 = a.x + (dx / dist) * r, y1 = a.y + (dy / dist) * r;
          const x2 = b.x - (dx / dist) * (r + 5), y2 = b.y - (dy / dist) * (r + 5);
          const d = e.curved
            ? `M${x1},${y1 + 20} Q350,260 ${x2},${y2 + 20}`
            : e.from === e.to
              ? `M${a.x - 18},${a.y - 20} C${a.x - 65},${a.y - 90} ${a.x + 65},${a.y - 90} ${a.x + 18},${a.y - 20}`
              : `M${x1},${y1} L${x2},${y2}`;
          return (
            <motion.path
              key={e.id}
              className={`edge ${e.active ? 'active' : ''}`}
              initial={{ d, pathLength: 0, opacity: 0 }}
              animate={{ d, pathLength: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65 / speed }}
              strokeWidth={e.active ? 2.8 : 1.6}
              markerEnd={`url(#${e.active ? 'arrow-active' : 'arrow'})`}
            />
          );
        })}
      </AnimatePresence>
      {frame.nodes.map((n: VisualNode) => (
        <motion.g
          key={n.id}
          className={`viz-node ${n.state ?? ''}`}
          initial={false}
          animate={{ x: n.x, y: n.y, opacity: n.state === 'muted' ? 0.3 : 1 }}
          transition={{ type: 'spring', stiffness: 85 * speed, damping: 18 }}
        >
          {graph ? <circle r="25" className="shape" strokeWidth="2" /> : <rect x="-27" y="-27" width="54" height="54" rx="9" className="shape" strokeWidth="1.5" />}
          <text textAnchor="middle" dominantBaseline="central" className="node-value">{n.value}</text>
          {n.sub !== undefined && <text y="48" textAnchor="middle" className="svg-caption">{n.sub}</text>}
        </motion.g>
      ))}
      {frame.pointers.map(p => (
        <motion.g key={p.id} initial={false} animate={{ x: p.x, y: p.y }} transition={{ type: 'spring', stiffness: 75 * speed, damping: 17 }}>
          <text textAnchor="middle" className="pointer-label" style={{ fill: pointerColor(p.color) }}>{p.label}</text>
          <path d="M0 8V26M-4 22L0 26L4 22" fill="none" strokeWidth="2" style={{ stroke: pointerColor(p.color) }} />
        </motion.g>
      ))}
      {frame.focus && (() => {
        const n = frame.nodes.find(n => n.id === frame.focus);
        return n ? <motion.circle r="34" className="focus-ring" initial={false} animate={{ cx: n.x, cy: n.y }} transition={{ duration: 0.65 / speed }} /> : null;
      })()}
      {frame.nodes.length === 0 && <text x="350" y="145" textAnchor="middle" className="svg-caption">Empty input · nothing to visit</text>}
    </svg>
  );
}

type Props = {
  problem: Problem;
  /** False while the tab is hidden, so playback pauses. */
  active: boolean;
  /** A nonzero value that changes starts playback (used by the quick guide). */
  playToken: number;
  focused: boolean;
  onToggleFocus: () => void;
};

export function Visualizer({ problem, active, playToken, focused, onToggleFocus }: Props) {
  const [demo, setDemo] = useState(problem.demo);
  const [draft, setDraft] = useState(problem.demo);
  const [inputError, setInputError] = useState('');
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const frames = useMemo(() => buildFrames(problem.id, demo), [problem.id, demo]);
  const frame = frames[Math.min(step, frames.length - 1)];
  const last = frames.length - 1;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setStep(s => {
      if (s >= last) {
        setPlaying(false);
        return s;
      }
      return s + 1;
    }), 1800 / speed);
    return () => clearInterval(timer);
  }, [playing, speed, last]);

  useEffect(() => { if (!active) setPlaying(false); }, [active]);
  useEffect(() => { if (playToken) { setStep(0); setPlaying(true); } }, [playToken]);
  useEffect(() => {
    if (editing) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [editing]);

  function play() {
    if (step === last) setStep(0);
    setPlaying(!playing);
  }

  function applyInput() {
    try {
      buildFrames(problem.id, draft);
      setDemo(draft);
      setStep(0);
      setPlaying(false);
      setEditing(false);
    } catch (e) {
      setInputError(e instanceof Error ? e.message : 'Invalid input');
    }
  }

  return (
    <div className="visualizer">
      <div className="viz-toolbar">
        <span className="viz-crumb">
          {problem.category}
          <ChevronRight size={12} />
          <b>{patternName[problem.id]}</b>
        </span>
        <div className="viz-actions">
          <button className="chip-btn" onClick={() => { setDraft(demo); setInputError(''); setPlaying(false); setEditing(true); }}>
            <Braces size={13} />Edit input
          </button>
          <button className="icon-btn" aria-label={focused ? 'Exit focus mode' : 'Focus animation'} title={focused ? 'Exit focus mode' : 'Focus animation'} onClick={onToggleFocus}>
            {focused ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      <div className="viz-scroll">
        <div className="stage">
          <div className="scene-heading">
            <code>{frame.stats ?? 'Follow the highlighted objects'}</code>
            <span className="scene-legend">
              <i className="active" />Active <i className="visited" />Visited <i className="found" />Found
            </span>
          </div>
          <Scene frame={frame} problem={problem} speed={speed} />
          {frame.memory !== undefined && (
            <div className="memory-strip">
              <span>{frame.memoryLabel}</span>
              <div>
                <AnimatePresence mode="popLayout">
                  {frame.memory.length ? frame.memory.map(([key, value]) => (
                    <motion.code
                      layout
                      key={key}
                      initial={{ opacity: 0, y: -22, scale: 0.7 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 / speed }}
                    >
                      {problem.id === 'two-sum' ? `${key} → ${value}` : value}
                    </motion.code>
                  )) : <em>empty</em>}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        <div className={`narration ${frame.result ? 'complete' : ''}`} aria-live="polite">
          <div className="step-number">{frame.result ? <Check size={16} /> : String(step + 1).padStart(2, '0')}</div>
          <div>
            <strong>{frame.title}</strong>
            <p>{frame.text}</p>
          </div>
          {frame.result && <code className="result-pill">{frame.result}</code>}
        </div>

        <div className="algorithm">
          <div className="section-label">Algorithm</div>
          {problem.pseudocode.map((line, i) => (
            <div key={line} className={i === frame.line ? 'current-line' : ''}>
              <span>{i + 1}</span>
              <p>{line}</p>
            </div>
          ))}
        </div>
        <p className="fine viz-note">The animation follows the reference solution, not your code.</p>
      </div>

      <div className="playback">
        <button className="icon-btn" aria-label="Restart animation" title="Restart" onClick={() => { setStep(0); setPlaying(false); }}><RotateCcw size={15} /></button>
        <button className="icon-btn" aria-label="Previous step" title="Previous step" disabled={step === 0} onClick={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}><SkipBack size={16} /></button>
        <button className="play-button" aria-label={playing ? 'Pause animation' : 'Play animation'} onClick={play}>
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <button className="icon-btn" aria-label="Next step" title="Next step" disabled={step === last} onClick={() => { setPlaying(false); setStep(s => Math.min(last, s + 1)); }}><SkipForward size={16} /></button>
        <input type="range" aria-label="Animation step" min="0" max={last} value={step} onChange={e => { setStep(Number(e.target.value)); setPlaying(false); }} />
        <span className="step-count">{step + 1}<span> / {frames.length}</span></span>
        <select aria-label="Animation speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}>
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </select>
      </div>

      <dialog ref={dialogRef} onCancel={() => setEditing(false)} onClick={e => { if (e.target === e.currentTarget) setEditing(false); }}>
        <div className="dialog-heading">
          <h2>Custom animation input</h2>
          <button className="icon-btn" aria-label="Close input editor" onClick={() => setEditing(false)}><X size={18} /></button>
        </div>
        <p>Change the values and watch the reference algorithm work through them.</p>
        <label className="input-label" htmlFor="custom-input">Input · JSON</label>
        <textarea id="custom-input" spellCheck={false} value={draft} onChange={e => setDraft(e.target.value)} />
        {inputError && <p className="error-box" role="alert">{inputError}</p>}
        <div className="dialog-actions">
          <button className="btn" onClick={() => setDraft(problem.demo)}>Default example</button>
          <button className="btn btn-primary" onClick={applyInput}>Animate</button>
        </div>
      </dialog>
    </div>
  );
}
