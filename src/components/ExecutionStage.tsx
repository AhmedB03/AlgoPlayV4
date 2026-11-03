import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import type { Problem } from "../problems";
import type { TraceStep, HeapNode } from "../userTrace";
import {
  graphEdges,
  inputValues,
  isRecord,
  pointerValues,
  sequence,
  short,
} from "../visualState";

import { MOVE_SECONDS } from "../playback";
const colors = [
  "var(--lab-cyan)",
  "var(--lab-purple)",
  "var(--lab-amber)",
  "var(--lab-pink)",
  "var(--lab-green)",
];
type Props = {
  problem: Problem;
  step?: TraceStep;
  previous?: TraceStep;
  collection: string;
  pointer: string;
  speed: number;
};
export function ExecutionStage({
  problem,
  step,
  previous,
  collection,
  pointer,
  speed,
}: Props) {
  const reduce = useReducedMotion();
  const transition = {
    duration: reduce ? 0 : MOVE_SECONDS / speed,
    ease: "easeInOut" as const,
  };
  const uid = useId().replaceAll(":", "");
  const locals = step?.locals ?? {};
  const inputs = inputValues(problem);
  const source =
    collection ||
    (problem.id === "palindrome" && typeof locals.text === "string"
      ? "text"
      : problem.id === "parentheses"
        ? "s"
        : problem.id === "reverse-list"
          ? "head"
          : "nums");
  const raw = source in locals ? locals[source] : inputs[source];
  const values = (sequence(raw) ?? []).slice(0, 30);
  const pointers = pointerValues(locals, pointer);
  const scalarStrings = Object.entries(locals).filter(
    ([k, v]) =>
      typeof v === "string" &&
      /^(node|current|curr|vertex|neighbor|next|start)$/.test(k),
  );
  const inputGraph = inputs.graph;
  const graph = isRecord(locals.graph)
    ? locals.graph
    : isRecord(inputGraph)
      ? inputGraph
      : {};
  const isGraph = problem.id === "graph-bfs";
  const isList = problem.id === "reverse-list";
  const stack = Object.entries(locals).find(
    ([k, v]) => Array.isArray(v) && /stack/i.test(k),
  );
  const queue = Object.entries(locals).find(
    ([k, v]) => Array.isArray(v) && /queue|order/i.test(k),
  );
  const memory = Object.entries(locals).find(
    ([k, v]) => isRecord(v) && !("val" in v) && k !== "graph" && k !== "pairs",
  );
  const slots = Math.max(values.length, 1);
  const gap = Math.min(82, 640 / slots);
  const cellWidth = Math.min(58, gap - 5);
  const left = 400 - ((slots - 1) * gap) / 2;
  const visibleHeap: HeapNode[] = step?.heap?.length
    ? step.heap.slice(0, 10)
    : ((inputs.head as unknown[]) ?? []).slice(0, 10).map((value, i, a) => ({
        id: `input-${i}`,
        value,
        next: i < a.length - 1 ? `input-${i + 1}` : null,
      }));
  const listGap = Math.min(105, 650 / Math.max(visibleHeap.length, 1));
  const listX = (id: string) =>
    400 -
    ((visibleHeap.length - 1) * listGap) / 2 +
    visibleHeap.findIndex((n) => n.id === id) * listGap;
  const graphNames = [
    ...new Set([...Object.keys(graph), ...graphEdges(graph).map((e) => e.to)]),
  ].slice(0, 14);
  const point = (name: string) => {
    const i = graphNames.indexOf(name),
      angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(graphNames.length, 1);
    return { x: 400 + Math.cos(angle) * 205, y: 180 + Math.sin(angle) * 115 };
  };
  const changedEdges = new Set(
    visibleHeap
      .filter(
        (n) => previous?.heap?.find((p) => p.id === n.id)?.next !== n.next,
      )
      .map((n) => n.id),
  );
  const seen = locals.seen ?? locals.visited;
  const visited = (name: string) =>
    Array.isArray(seen)
      ? seen.includes(name)
      : isRecord(seen)
        ? name in seen
        : false;
  const arrayOld = sequence(previous?.locals[source]);
  return (
    <div
      className="lab-stage"
      data-kind={
        isList ? "linked-list" : isGraph ? "graph" : stack ? "stack" : "array"
      }
    >
      <div className="lab-stage-caption">
        <span>
          {isList
            ? "POINTER MEMORY"
            : isGraph
              ? "GRAPH TOPOLOGY"
              : stack
                ? "SEQUENCE + STACK"
                : `SEQUENCE / ${source}`}
        </span>
        <span>
          {!step
            ? "Input preview · not executed"
            : (
                  isList
                    ? !step.heap?.length
                    : isGraph
                      ? !("graph" in locals)
                      : !(source in locals)
                )
              ? "Input context"
              : "Captured state"}
        </span>
      </div>
      <div
        className="lab-canvas-wrap"
        data-wide={!isList && !isGraph && values.length > 12}
      >
        <svg
          className="lab-canvas"
          viewBox={
            isList || isGraph
              ? "0 0 800 360"
              : `${400 - Math.max(460, Math.min(800, slots * gap + 150)) / 2} 0 ${Math.max(460, Math.min(800, slots * gap + 150))} 360`
          }
          role="img"
          aria-label={`${problem.title}: ${step ? `captured state before line ${step.line}` : "input preview"}`}
        >
          <defs>
            <pattern
              id={`${uid}-grid`}
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="var(--lab-grid)" />
            </pattern>
            <marker
              id={`${uid}-arrow`}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0 0L8 4L0 8Z" fill="var(--lab-cyan)" />
            </marker>
          </defs>
          <rect width="800" height="360" fill={`url(#${uid}-grid)`} />
          {isGraph ? (
            <>
              {graphEdges(graph)
                .filter(
                  (e) =>
                    graphNames.includes(e.from) && graphNames.includes(e.to),
                )
                .map((e, i) => {
                  const a = point(e.from),
                    b = point(e.to);
                  const dx = b.x - a.x,
                    dy = b.y - a.y,
                    d = Math.hypot(dx, dy) || 1;
                  return (
                    <path
                      key={i}
                      className="lab-edge"
                      markerEnd={`url(#${uid}-arrow)`}
                      d={
                        e.from === e.to
                          ? `M${a.x - 18} ${a.y - 22}c-80 -75 110 -75 36 0`
                          : `M${a.x + (dx / d) * 31} ${a.y + (dy / d) * 31}L${b.x - (dx / d) * 38} ${b.y - (dy / d) * 38}`
                      }
                    />
                  );
                })}
              {graphNames.map((name) => {
                const p = point(name),
                  active = scalarStrings.some(([, v]) => v === name);
                return (
                  <g key={name} transform={`translate(${p.x},${p.y})`}>
                    <motion.circle
                      r="39"
                      className="lab-halo"
                      animate={{
                        opacity: active ? 1 : 0,
                        scale: active ? 1 : 0.8,
                      }}
                      transition={transition}
                    />
                    <motion.circle
                      r="29"
                      animate={{
                        fill: active
                          ? "var(--lab-cyan)"
                          : visited(name)
                            ? "var(--lab-visited)"
                            : "var(--lab-node)",
                        stroke: active
                          ? "var(--lab-cyan)"
                          : visited(name)
                            ? "var(--lab-green)"
                            : "var(--lab-line)",
                      }}
                      transition={transition}
                      strokeWidth="2"
                    />
                    <text
                      className="lab-value"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        fill: active ? "var(--lab-on-accent)" : "var(--text)",
                      }}
                    >
                      {short(name, 8)}
                    </text>
                    <text className="lab-svg-label" y="52" textAnchor="middle">
                      {scalarStrings
                        .filter(([, v]) => v === name)
                        .map(([k]) => k)
                        .join(", ") || (visited(name) ? "seen" : "")}
                    </text>
                  </g>
                );
              })}
            </>
          ) : isList ? (
            <>
              <AnimatePresence>
                {visibleHeap
                  .filter(
                    (n) => n.next && visibleHeap.some((t) => t.id === n.next),
                  )
                  .map((n) => {
                    const x = listX(n.id),
                      end = listX(n.next!),
                      forward = end > x;
                    return (
                      <motion.path
                        key={n.id}
                        className={`lab-link ${changedEdges.has(n.id) ? "changed" : ""}`}
                        initial={false}
                        animate={{
                          d:
                            n.id === n.next
                              ? `M${x - 16} 150 C${x - 90} 55 ${x + 90} 55 ${x + 16} 144`
                              : forward
                                ? `M${x + 32} 180 Q${(x + end) / 2} 180 ${end - 40} 180`
                                : `M${x - 15} 156 Q${(x + end) / 2} 72 ${end + 15} 145`,
                        }}
                        transition={transition}
                        markerEnd={`url(#${uid}-arrow)`}
                      />
                    );
                  })}
              </AnimatePresence>
              {visibleHeap.map((n) => (
                <g key={n.id} transform={`translate(${listX(n.id)},180)`}>
                  <rect
                    x="-30"
                    y="-30"
                    width="60"
                    height="60"
                    rx="15"
                    className="lab-list-node"
                  />
                  <text
                    className="lab-value"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {short(n.value, 5)}
                  </text>
                  <text y="55" textAnchor="middle" className="lab-svg-label">
                    {n.id}
                  </text>
                  {n.next === null && (
                    <text y="78" textAnchor="middle" className="lab-svg-label">
                      next → null
                    </text>
                  )}
                </g>
              ))}
              {Object.entries(step?.refs ?? {})
                .filter(
                  ([, ref]) => ref && visibleHeap.some((n) => n.id === ref),
                )
                .map(([name, ref], i, refs) => (
                  <motion.g
                    key={name}
                    initial={false}
                    animate={{
                      x: listX(ref!),
                      y:
                        300 +
                        refs.slice(0, i).filter(([, r]) => r === ref).length *
                          25,
                    }}
                    transition={transition}
                  >
                    <text
                      textAnchor="middle"
                      className="lab-svg-pointer"
                      fill={colors[i % colors.length]}
                    >
                      {name}
                    </text>
                    <path
                      d="M0 -16v-14m-4 5 4-5 4 5"
                      fill="none"
                      stroke={colors[i % colors.length]}
                      strokeWidth="2"
                    />
                  </motion.g>
                ))}
            </>
          ) : (
            <>
              {values.map((v, i) => {
                const pointed =
                  pointers.some(([, n]) => n === i) ||
                  (typeof locals.char === "string" && v === locals.char);
                const changed =
                  arrayOld && JSON.stringify(arrayOld[i]) !== JSON.stringify(v);
                const numeric = typeof v === "number";
                const height = numeric ? Math.min(70, Math.abs(v) * 3 + 12) : 0;
                return (
                  <motion.g
                    key={i}
                    initial={false}
                    animate={{ x: left + i * gap }}
                    transition={transition}
                  >
                    {numeric && (
                      <motion.rect
                        x={-cellWidth / 2 + 4}
                        width={cellWidth - 8}
                        rx="4"
                        className="lab-bar"
                        initial={false}
                        animate={{ y: 205 - height, height }}
                        transition={transition}
                      />
                    )}
                    <motion.rect
                      className={
                        pointed
                          ? "lab-active-cell"
                          : changed
                            ? "lab-mutated-cell"
                            : undefined
                      }
                      x={-cellWidth / 2}
                      y="210"
                      width={cellWidth}
                      height="58"
                      rx="12"
                      initial={false}
                      animate={{
                        fill: pointed
                          ? "var(--lab-cyan)"
                          : changed
                            ? "var(--lab-visited)"
                            : "var(--lab-node)",
                        stroke: pointed ? "var(--lab-cyan)" : "var(--lab-line)",
                      }}
                      transition={transition}
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="240"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="lab-value"
                      style={{
                        fontSize: values.length > 12 ? 16 : 22,
                        fill: pointed ? "var(--lab-on-accent)" : "var(--text)",
                      }}
                    >
                      {short(v, 5)}
                    </text>
                    <text
                      x="0"
                      y="293"
                      textAnchor="middle"
                      className="lab-svg-label"
                    >
                      {i}
                    </text>
                  </motion.g>
                );
              })}
              {pointers.map(([name, n], i) => (
                <motion.g
                  key={name}
                  initial={false}
                  animate={{
                    x: left + Math.max(-0.6, Math.min(slots - 0.4, n)) * gap,
                    y: 70 + (i % 3) * 29,
                  }}
                  transition={transition}
                >
                  <rect
                    x="-29"
                    y="-17"
                    width="58"
                    height="25"
                    rx="6"
                    fill={colors[i % colors.length]}
                    fillOpacity=".13"
                  />
                  <text
                    textAnchor="middle"
                    className="lab-svg-pointer"
                    fill={colors[i % colors.length]}
                  >
                    {name} = {n}
                  </text>
                  <path
                    d={`M0 14V${126 - (i % 3) * 29}m-4 -5 4 5 4-5`}
                    stroke={colors[i % colors.length]}
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray={n < 0 || n >= slots ? "4 4" : undefined}
                  />
                </motion.g>
              ))}
              {!values.length && (
                <text
                  x="400"
                  y="215"
                  textAnchor="middle"
                  className="lab-svg-label"
                >
                  {raw === undefined
                    ? "Choose a captured sequence to display"
                    : "Empty sequence"}
                </text>
              )}
              <text
                x="400"
                y="335"
                textAnchor="middle"
                className="lab-svg-label"
              >
                {(sequence(raw)?.length ?? 0) > 30
                  ? "Showing the first 30 elements"
                  : step
                    ? "Indices and pointers reflect captured values"
                    : "Run your code to animate this input"}
              </text>
            </>
          )}
        </svg>
      </div>
      <div className="lab-support">
        {stack ? (
          <div className="lab-memory">
            <header>
              <span>STACK</span>
              <b>{stack[0]}</b>
              <small>{(stack[1] as unknown[]).length} items</small>
            </header>
            <div className="lab-stack">
              <AnimatePresence mode="popLayout">
                {(stack[1] as unknown[]).slice(-10).map((v, i) => (
                  <motion.div
                    key={`${i}-${short(v)}`}
                    layout
                    initial={{ opacity: 0, y: -24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 35 }}
                    transition={transition}
                  >
                    {short(v)}
                    <small>
                      {i === (stack[1] as unknown[]).length - 1 ? "← top" : i}
                    </small>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!(stack[1] as unknown[]).length && (
                <span className="lab-empty">Stack is empty</span>
              )}
            </div>
          </div>
        ) : null}
        {queue ? (
          <div className="lab-memory">
            <header>
              <span>{/queue/i.test(queue[0]) ? "QUEUE" : "OUTPUT"}</span>
              <b>{queue[0]}</b>
              <small>{(queue[1] as unknown[]).length} items</small>
            </header>
            <div className="lab-queue">
              <AnimatePresence>
                {(queue[1] as unknown[]).slice(0, 14).map((v, i) => (
                  <motion.div
                    layout
                    key={`${i}-${short(v)}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, y: -25 }}
                    transition={transition}
                  >
                    {short(v, 8)}
                    <small>{i}</small>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : null}
        {memory ? (
          <div className="lab-memory">
            <header>
              <span>HASH MAP</span>
              <b>{memory[0]}</b>
              <small>{Object.keys(memory[1] as object).length} entries</small>
            </header>
            <div className="lab-map">
              <AnimatePresence>
                {Object.entries(memory[1] as Record<string, unknown>)
                  .slice(0, 10)
                  .map(([k, v]) => (
                    <motion.div
                      key={k}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={transition}
                    >
                      <span>{k}</span>
                      <i>→</i>
                      <b>{short(v, 12)}</b>
                    </motion.div>
                  ))}
              </AnimatePresence>
              {!Object.keys(memory[1] as object).length && (
                <span className="lab-empty">No entries yet</span>
              )}
            </div>
          </div>
        ) : null}
        {!stack && !queue && !memory && (
          <div className="lab-memory lab-caption">
            <span className="lab-dot" />{" "}
            {step
              ? "Each frame is a snapshot of your running code."
              : "The stage is ready. Your code determines what happens next."}
          </div>
        )}
      </div>
    </div>
  );
}
