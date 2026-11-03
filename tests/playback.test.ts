import { expect, it } from "vitest";
import {
  FRAME_MS,
  MOVE_SECONDS,
  frameChanges,
  nextChange,
} from "../src/playback";
it("halves the old playback and transition speeds at every setting", () => {
  for (const speed of [0.5, 1, 1.5, 2]) {
    expect(FRAME_MS / speed).toBe((2 * 850) / speed);
    expect(MOVE_SECONDS / speed).toBe((2 * 0.42) / speed);
  }
});
it("explains actual mutations and skips unchanged source frames", () => {
  const a = {
    line: 1,
    event: "line",
    locals: { i: 0 },
    heap: [{ id: "n0", value: 1, next: "n1" }],
  };
  const b = { ...a, line: 2 };
  const c = {
    ...a,
    line: 3,
    locals: { i: 2 },
    heap: [{ id: "n0", value: 1, next: null }],
  };
  expect(nextChange([a, b, c], 0)).toBe(2);
  expect(frameChanges(b, c)).toEqual([
    { name: "i", before: "0", after: "2" },
    { name: "n0.next", before: "n1", after: "null" },
  ]);
  expect(nextChange([a], 0)).toBe(0);
});
