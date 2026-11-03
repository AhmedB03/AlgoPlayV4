import type { TraceStep } from "./userTrace";
import { short } from "./visualState";
export const FRAME_MS = 1700;
export const MOVE_SECONDS = 0.84;
export function frameChanges(
  before: TraceStep | undefined,
  after: TraceStep | undefined,
) {
  if (!after) return [];
  const names = new Set([
    ...Object.keys(before?.locals ?? {}),
    ...Object.keys(after.locals),
  ]);
  const changes = [...names]
    .filter(
      (name) =>
        JSON.stringify(before?.locals[name]) !==
        JSON.stringify(after.locals[name]),
    )
    .map((name) => ({
      name,
      before:
        name in (before?.locals ?? {})
          ? short(before!.locals[name], 24)
          : "unset",
      after:
        name in after.locals ? short(after.locals[name], 24) : "out of scope",
    }));
  for (const node of after.heap ?? []) {
    const old = before?.heap?.find((n) => n.id === node.id);
    if (old && old.next !== node.next)
      changes.push({
        name: `${node.id}.next`,
        before: old.next ?? "null",
        after: node.next ?? "null",
      });
  }
  return changes;
}
export function nextChange(steps: TraceStep[], index: number) {
  for (let i = index + 1; i < steps.length; i++)
    if (frameChanges(steps[i - 1], steps[i]).length) return i;
  return Math.max(0, steps.length - 1);
}
