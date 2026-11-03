import type { Verdict } from './components/Console';
import { problems } from './problems';

export type Submission = { at: number; verdict: Verdict; passed: number; total: number; runtime?: number };
const ids = new Set(problems.map(p => p.id));
const verdicts = new Set<string>(['Accepted', 'Wrong Answer', 'Runtime Error', 'Compile Error', 'Time Limit Exceeded']);
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const nonnegative = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const integer = (v: unknown): v is number => nonnegative(v) && Number.isSafeInteger(v);

export const isTheme = (v: unknown): v is 'light' | 'dark' => v === 'light' || v === 'dark';
export const isCodes = (v: unknown): v is Record<string, string> => record(v) && Object.entries(v).every(([id, code]) => ids.has(id) && typeof code === 'string');
export const isSolved = (v: unknown): v is string[] => Array.isArray(v) && v.every(id => typeof id === 'string' && ids.has(id)) && new Set(v).size === v.length;

function isSubmission(v: unknown): v is Submission {
  return record(v) && integer(v.at) && v.at <= 8.64e15 && typeof v.verdict === 'string' && verdicts.has(v.verdict)
    && integer(v.passed) && integer(v.total) && v.total > 0 && v.passed <= v.total
    && (v.verdict !== 'Accepted' || v.passed === v.total)
    && (v.runtime === undefined || nonnegative(v.runtime));
}

export const isSubmissions = (v: unknown): v is Record<string, Submission[]> => record(v)
  && Object.entries(v).every(([id, entries]) => ids.has(id) && Array.isArray(entries) && entries.length <= 20 && entries.every(isSubmission));

export const isSplit = (v: unknown): v is { x: number; y: number } => record(v)
  && nonnegative(v.x) && v.x >= 25 && v.x <= 70
  && nonnegative(v.y) && v.y >= 20 && v.y <= 85;
