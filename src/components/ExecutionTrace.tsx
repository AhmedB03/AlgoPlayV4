import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Workflow,
} from "lucide-react";
import type { TraceStep } from "../userTrace";
import type { Problem } from "../problems";
import type { RunState } from "./Console";
import { changes, inputValues, sequence, short } from "../visualState";
import { ExecutionStage } from "./ExecutionStage";

const EMPTY: TraceStep[] = [];
type Props = {
  steps?: TraceStep[];
  source: string;
  stale: boolean;
  active: boolean;
  run: () => void;
  running: boolean;
  problem: Problem;
  result: RunState | null;
  focused: boolean;
  toggleFocus: () => void;
};
export function ExecutionTrace({
  steps = EMPTY,
  source,
  stale,
  active,
  run,
  running,
  problem,
  result,
  focused,
  toggleFocus,
}: Props) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  const [collection, setCollection] = useState(""),
    [pointer, setPointer] = useState("");
  useEffect(() => {
    setIndex(0);
    setPlaying(steps.length > 0 && active && !reduce);
  }, [steps]);
  useEffect(() => {
    setCollection("");
    setPointer("");
  }, [problem.id]);
  useEffect(() => {
    if (!active || stale || running) setPlaying(false);
  }, [active, stale, running]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setIndex((i) => {
          if (i >= steps.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        }),
      850 / speed,
    );
    return () => clearInterval(timer);
  }, [playing, steps.length, speed]);
  const step = steps[Math.min(index, steps.length - 1)],
    previous = index > 0 ? steps[index - 1] : undefined;
  const changed = new Set(changes(previous, step).map((c) => c.name));
  const arrays = [
    ...new Set(
      [
        ...Object.entries(inputValues(problem)),
        ...steps.flatMap((s) => Object.entries(s.locals)),
      ]
        .filter(([, v]) => sequence(v) !== null)
        .map(([k]) => k),
    ),
  ];
  const integers = [
    ...new Set(
      steps
        .flatMap((s) => Object.entries(s.locals))
        .filter(([, v]) => Number.isInteger(v))
        .map(([k]) => k),
    ),
  ];
  const jump = (i: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(steps.length - 1, i)));
  };
  const play = () => {
    if (index === steps.length - 1) setIndex(0);
    setPlaying((p) => !p);
  };
  const verdict = result?.results[0];
  return (
    <div
      className="execution-lab"
      tabIndex={0}
      aria-label="Execution visualizer"
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || !steps.length || stale) return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          jump(index + 1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          jump(index - 1);
        }
        if (e.key === " ") {
          e.preventDefault();
          play();
        }
      }}
    >
      <header className="lab-heading">
        <div className="lab-heading-copy">
          <span className="lab-kicker">
            <Workflow size={13} /> ALGORITHM LAB <i /> CASE 01
          </span>
          <h2>{problem.title}</h2>
          <p>{problem.summary}</p>
        </div>
        <button
          className="lab-icon"
          aria-label={
            focused ? "Exit expanded visualizer" : "Expand visualizer"
          }
          onClick={toggleFocus}
        >
          {focused ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </header>
      <div className="lab-meta">
        <span className={`lab-status ${step ? "recorded" : ""}`}>
          <i />
          {running
            ? "Executing your code…"
            : step
              ? `${steps.length} captured frames`
              : "Ready to visualize"}
        </span>
        <span>{problem.category}</span>
      </div>
      {stale && (
        <p role="status" className="lab-notice">
          Code changed. Run again to refresh this recording.
        </p>
      )}
      {result?.error && !running && (
        <p role="alert" className="lab-notice">
          {result.verdict}: {result.error}
        </p>
      )}
      <ExecutionStage
        problem={problem}
        step={step}
        previous={previous}
        collection={collection}
        pointer={pointer}
        speed={speed}
      />
      <div className="lab-player">
        <div className="lab-timeline">
          <span>{step ? String(index + 1).padStart(2, "0") : "00"}</span>
          <input
            aria-label="Execution step"
            type="range"
            min="0"
            max={Math.max(steps.length - 1, 0)}
            value={Math.min(index, Math.max(0, steps.length - 1))}
            disabled={!step || stale}
            onChange={(e) => jump(+e.target.value)}
          />
          <span>{String(steps.length).padStart(2, "0")}</span>
        </div>
        <div className="lab-transport">
          <div className="lab-transport-buttons">
            <button
              className="lab-icon"
              aria-label="Restart playback"
              disabled={!step || stale}
              onClick={() => jump(0)}
            >
              <RotateCcw size={15} />
            </button>
            <button
              className="lab-icon"
              aria-label="Previous frame"
              disabled={!step || index === 0 || stale}
              onClick={() => jump(index - 1)}
            >
              <SkipBack size={17} />
            </button>
            <button
              className="lab-play"
              aria-label={playing ? "Pause playback" : "Play recording"}
              disabled={!step || stale}
              onClick={play}
            >
              {playing ? <Pause size={19} /> : <Play size={19} />}
            </button>
            <button
              className="lab-icon"
              aria-label="Next frame"
              disabled={!step || index === steps.length - 1 || stale}
              onClick={() => jump(index + 1)}
            >
              <SkipForward size={17} />
            </button>
            <select
              aria-label="Playback speed"
              value={speed}
              onChange={(e) => setSpeed(+e.target.value)}
            >
              {[0.5, 1, 1.5, 2].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </div>
          <button className="lab-run" disabled={running} onClick={run}>
            <Play size={14} />
            {running ? "Running…" : "Run & visualize"}
          </button>
        </div>
      </div>
      <div className="lab-inspector">
        {step ? (
          <>
            <div className="lab-line">
              <span>
                {step.event === "return"
                  ? "RETURN"
                  : step.event === "exception"
                    ? "EXCEPTION"
                    : "BEFORE LINE"}{" "}
                {step.line}
              </span>
              <code>{source.split("\n")[step.line - 1]?.trim()}</code>
            </div>
            <div className="lab-watch trace-variables">
              {Object.entries(step.locals)
                .filter(([, v]) => !v || typeof v !== "object")
                .map(([name, value]) => (
                  <div
                    className={changed.has(name) ? "changed" : ""}
                    key={name}
                  >
                    <span>{name}</span>
                    <b>{short(value, 40)}</b>
                  </div>
                ))}
            </div>
            {verdict && (
              <div
                className={`lab-result ${verdict.passed ? "passed" : "failed"}`}
              >
                <span>
                  {verdict.passed ? "✓ Case 1 passed" : "× Case 1 failed"}
                </span>
                <code>{verdict.error ?? `Output: ${verdict.actual}`}</code>
              </div>
            )}
            <details className="lab-details">
              <summary>Inspect variables & source</summary>
              <div className="lab-bindings">
                {!["reverse-list", "graph-bfs"].includes(problem.id) && (
                  <label>
                    Sequence
                    <select
                      aria-label="Visualized sequence"
                      value={collection}
                      onChange={(e) => setCollection(e.target.value)}
                    >
                      <option value="">Auto</option>
                      {arrays.map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Extra index pointer
                  <select
                    aria-label="Extra index pointer"
                    value={pointer}
                    onChange={(e) => setPointer(e.target.value)}
                  >
                    <option value="">Auto</option>
                    {integers.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="lab-all-values">
                {Object.entries(step.locals).map(([k, v]) => (
                  <div key={k}>
                    <b>{k}</b>
                    <code>{JSON.stringify(v)}</code>
                  </div>
                ))}
              </div>
              <pre className="trace-source">
                {source.split("\n").map((line, i) => (
                  <div
                    className={i + 1 === step.line ? "executing" : ""}
                    key={i}
                  >
                    <span>{i + 1}</span>
                    {line || " "}
                  </div>
                ))}
              </pre>
            </details>
          </>
        ) : (
          <p className="lab-hint">
            Run your solution, then play or scrub through its execution. The
            canvas follows your code, including mistakes.
          </p>
        )}
        <p className="lab-footnote">
          {steps.length >= 500 ? "Recording capped at 500 frames. " : ""}Case 1
          · bounded snapshots
          {step ? " · Use ← → to step when the visualizer is focused." : ""}
        </p>
      </div>
    </div>
  );
}
