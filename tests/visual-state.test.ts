import { describe, expect, it } from "vitest";
import { createHeapTracker } from "../src/userTrace";
import { graphEdges, inputValues, pointerValues } from "../src/visualState";
import { problems } from "../src/problems";
describe("visual state identity", () => {
  it("retains detached nodes, aliases and duplicate values while links reverse", () => {
    const tail = { val: 1, next: null as unknown };
    const head = { val: 1, next: tail as unknown };
    const track = createHeapTracker();
    const before = track({ head, curr: head, prev: null });
    expect(before.heap).toHaveLength(2);
    expect(before.refs.head).toBe(before.refs.curr);
    head.next = null;
    const detached = track({ head, curr: tail, prev: head });
    expect(detached.heap).toEqual([
      { id: "n0", value: 1, next: null },
      { id: "n1", value: 1, next: null },
    ]);
    tail.next = head;
    const reversed = track({ head, curr: null, prev: tail });
    expect(reversed.heap[1].next).toBe("n0");
    expect(reversed.refs.prev).toBe("n1");
    expect(before.heap[0].next).toBe("n1");
  });
  it("bounds cyclic heaps without conflating identity", () => {
    const head = { val: 3, next: null as unknown };
    head.next = head;
    const frame = createHeapTracker()({ head });
    expect(frame.heap).toEqual([{ id: "n0", value: 3, next: "n0" }]);
  });
  it("uses actual integer values, including custom pointer bindings", () => {
    expect(
      pointerValues({ left: 3, right: 5, marker: 2, target: 9 }, "marker"),
    ).toEqual([
      ["left", 3],
      ["right", 5],
      ["marker", 2],
    ]);
  });
  it("uses test inputs and actual graph edges without adding a reference solution", () => {
    expect(inputValues(problems[0])).toEqual({
      nums: [2, 7, 11, 15],
      target: 9,
    });
    expect(graphEdges({ A: ["C"], B: [], C: ["A"] })).toEqual([
      { from: "A", to: "C" },
      { from: "C", to: "A" },
    ]);
  });
});
