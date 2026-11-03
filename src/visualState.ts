import type { Problem } from "./problems";
import type { TraceStep } from "./userTrace";

export const short = (v: unknown, limit = 28) => {
  const text = typeof v === "string" ? v : (JSON.stringify(v) ?? "undefined");
  return text.length > limit ? text.slice(0, limit - 1) + "…" : text;
};
export const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export const sequence = (v: unknown): unknown[] | null =>
  Array.isArray(v) ? v : typeof v === "string" ? [...v] : null;
export function inputValues(p: Problem): Record<string, unknown> {
  const [a, b] = p.tests[0].args;
  if (p.id === "graph-bfs") return { graph: a, start: b };
  if (p.id === "reverse-list") return { head: a };
  if (p.id === "palindrome" || p.id === "parentheses") return { s: a };
  return { nums: a, target: b };
}
export function pointerValues(locals: Record<string, unknown>, extra = "") {
  return Object.entries(locals)
    .filter(
      ([name, v]) =>
        Number.isInteger(v) &&
        (/^(i|j|k|l|r|left|right|mid|lo|hi|low|high|index|idx|slow|fast|start|end)$/.test(
          name,
        ) ||
          name === extra),
    )
    .slice(0, 5) as [string, number][];
}
export function changes(
  previous: TraceStep | undefined,
  current: TraceStep | undefined,
) {
  if (!current) return [];
  return Object.entries(current.locals)
    .filter(
      ([k, v]) => JSON.stringify(previous?.locals[k]) !== JSON.stringify(v),
    )
    .map(([name, value]) => ({ name, value }));
}
export function graphEdges(graph: Record<string, unknown>) {
  return Object.entries(graph).flatMap(([from, list]) =>
    Array.isArray(list) ? list.map((to) => ({ from, to: String(to) })) : [],
  );
}
