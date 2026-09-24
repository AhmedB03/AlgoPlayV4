import type { Problem } from './problems';

/** Parameter names from the starter signature, e.g. `function twoSum(nums, target)` → ['nums', 'target']. */
export function paramNames(problem: Problem): string[] {
  const match = problem.starter.match(/\(([^)]*)\)/);
  return match ? match[1].split(',').map(s => s.trim()).filter(Boolean) : [];
}

export function show(value: unknown): string {
  return JSON.stringify(value) ?? 'undefined';
}

export function timeAgo(at: number): string {
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(at).toLocaleDateString();
}

export const patternName: Record<string, string> = {
  'two-sum': 'Hash map',
  'reverse-list': 'Pointer reversal',
  palindrome: 'Two pointers',
  'binary-search': 'Halving the search space',
  parentheses: 'Stack matching',
  'graph-bfs': 'Breadth-first search',
};
