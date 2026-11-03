import { evaluateCode } from './judge';
import { instrument, snapshot, createHeapTracker, type TraceStep } from './userTrace';
import pythonRunner from './pythonRunner.py?raw';

self.onmessage = async ({ data }) => {
  try {
    if (data.language === 'python') {
      const url = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs';
      const { loadPyodide } = await import(/* @vite-ignore */ url);
      const py = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/' });
      self.postMessage({ ready: true });
      py.globals.set('payload_json', JSON.stringify(data));
      const start = performance.now();
      const output = JSON.parse(await py.runPythonAsync(pythonRunner));
      self.postMessage({ ...output, runtime: performance.now() - start });
      return;
    }
    self.postMessage({ ready: true });
    const steps: TraceStep[] = [];
    const heapTracker = createHeapTracker();
    const hook = '__trace_' + crypto.randomUUID().replaceAll('-', '');
    (globalThis as unknown as Record<string, unknown>)[hook] = (line: number, getters: Record<string, () => unknown>) => {
      if (steps.length >= 500) return;
      const locals: Record<string, unknown> = {};
      const raw: Record<string, unknown> = {};
      for (const [name, get] of Object.entries(getters)) {
        try { const value = get(); if (typeof value !== 'function' && value !== globalThis) { raw[name] = value; locals[name] = snapshot(value); } } catch { /* Out of scope or not initialized. */ }
      }
      steps.push({ line, event: 'line', locals, ...heapTracker(raw) });
    };
    const start = performance.now();
    try {
      const first = evaluateCode(instrument(data.code, hook), { ...data.problem, tests: data.problem.tests.slice(0,1) });
      const rest = evaluateCode(data.code, { ...data.problem, tests: data.problem.tests.slice(1) });
      self.postMessage({ results: [...first, ...rest], steps, runtime: performance.now() - start });
    } finally { delete (globalThis as unknown as Record<string, unknown>)[hook]; }
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Error',
    });
  }
};
