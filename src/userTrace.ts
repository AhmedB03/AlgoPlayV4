import { parse } from "acorn";
import { fullAncestor, full } from "acorn-walk";
export type HeapNode = { id: string; value: unknown; next: string | null };
export type TraceStep = {
  line: number;
  event: string;
  locals: Record<string, unknown>;
  heap?: HeapNode[];
  refs?: Record<string, string | null>;
};

/** Keep node identity across snapshots, including detached and reversed links. */
export function createHeapTracker() {
  const ids = new Map<object, string>();
  const isNode = (v: unknown): v is { val: unknown; next: unknown } =>
    !!v && typeof v === "object" && "val" in v && "next" in v;
  const visit = (v: unknown): string | null => {
    if (!isNode(v)) return null;
    if (ids.has(v)) return ids.get(v)!;
    if (ids.size >= 30) return null;
    const id = `n${ids.size}`;
    ids.set(v, id);
    visit(v.next);
    return id;
  };
  return (values: Record<string, unknown>) => {
    const refs: Record<string, string | null> = {};
    for (const [name, v] of Object.entries(values))
      if (v === null || isNode(v)) refs[name] = visit(v);
    const heap: HeapNode[] = [];
    for (const [object, id] of ids) {
      const node = object as { val: unknown; next: unknown };
      heap.push({ id, value: snapshot(node.val), next: visit(node.next) });
    }
    return { heap, refs };
  };
}
export function instrument(code: string, hook: string): string {
  const ast = parse(code, { ecmaVersion: "latest", locations: true });
  const names = new Set<string>();
  full(ast, (node) => {
    if (node.type === "Identifier")
      names.add((node as unknown as { name: string }).name);
  });
  const vars = [...names]
    .filter((n) => {
      try {
        parse(`(${n})`, { ecmaVersion: "latest" });
        return n !== hook;
      } catch {
        return false;
      }
    })
    .map((n) => `${JSON.stringify(n)}:()=>${n}`)
    .join(",");
  const edits: { at: number; text: string }[] = [];
  fullAncestor(ast, (node, _state, ancestors) => {
    const parent = ancestors.at(-2);
    if (
      !parent ||
      node.type === "BlockStatement" ||
      node.type === "FunctionDeclaration" ||
      node.type === "EmptyStatement"
    )
      return;
    if (!node.type.endsWith("Statement") && node.type !== "VariableDeclaration")
      return;
    const p = parent as unknown as Record<string, unknown>;
    const inList =
      (parent.type === "BlockStatement" || parent.type === "Program") &&
      (p.body as unknown[]).includes(node);
    const single =
      [
        "IfStatement",
        "WhileStatement",
        "DoWhileStatement",
        "ForStatement",
        "ForOfStatement",
        "ForInStatement",
      ].includes(parent.type) &&
      [p.body, p.consequent, p.alternate].includes(node);
    if (!inList && !single) return;
    if (node.type === "ExpressionStatement" && "directive" in node) return;
    const call = `${hook}(${node.loc!.start.line},{${vars}});`;
    edits.push({ at: node.start, text: (single ? "{" : "") + call });
    if (single) edits.push({ at: node.end, text: "}" });
  });
  return edits
    .sort((a, b) => b.at - a.at)
    .reduce((s, e) => s.slice(0, e.at) + e.text + s.slice(e.at), code);
}
export function snapshot(
  value: unknown,
  depth = 0,
  seen = new Set<unknown>(),
): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number")
    return value;
  if (typeof value === "string") return value.slice(0, 200);
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[reference/cycle]";
  if (depth > 3) return "…";
  seen.add(value);
  if (value instanceof Map)
    return Object.fromEntries(
      [...value]
        .slice(0, 30)
        .map(([k, v]) => [String(k), snapshot(v, depth + 1, seen)]),
    );
  if (value instanceof Set)
    return [...value].slice(0, 30).map((v) => snapshot(v, depth + 1, seen));
  if (Array.isArray(value))
    return value.slice(0, 30).map((v) => snapshot(v, depth + 1, seen));
  return Object.fromEntries(
    Object.keys(value)
      .slice(0, 30)
      .map((k) => [
        k,
        snapshot((value as Record<string, unknown>)[k], depth + 1, seen),
      ]),
  );
}
