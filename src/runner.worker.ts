import { evaluateCode } from './judge';

self.onmessage = ({ data }) => {
  try {
    const start = performance.now();
    const results = evaluateCode(data.code, data.problem);
    self.postMessage({ results, runtime: performance.now() - start });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Error',
    });
  }
};
