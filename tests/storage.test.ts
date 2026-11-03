import { afterEach, describe, expect, it, vi } from 'vitest';
import { read, save } from '../src/storage';
import { isCodes, isSolved, isSplit, isSubmissions, isTheme } from '../src/savedState';
import { problems } from '../src/problems';

afterEach(() => vi.unstubAllGlobals());
const id = problems[0].id;
const submission = { at: 1000, verdict: 'Accepted', passed: 3, total: 3, runtime: 0.2 };

describe('saved progress validation', () => {
  it('preserves existing valid drafts and progress', () => {
    const codes = { [id]: 'function twoSum() { return [0, 1]; }' };
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(codes) });
    expect(read('algoplay-code', {}, isCodes)).toEqual(codes);
    expect(isSolved([id])).toBe(true);
    expect(isSubmissions({ [id]: [submission] })).toBe(true);
    expect(isSplit({ x: 25, y: 85 })).toBe(true);
    expect(isTheme('dark')).toBe(true);
  });

  it.each(['{', 'null', '[]', '42', '"draft"', '{"two-sum":null}'])('recovers from invalid drafts: %s', raw => {
    vi.stubGlobal('localStorage', { getItem: () => raw });
    expect(read('algoplay-code', {}, isCodes)).toEqual({});
  });

  it('handles missing and inaccessible storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => null });
    expect(read('algoplay-theme', 'dark', isTheme)).toBe('dark');
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } });
    expect(read('algoplay-solved', [], isSolved)).toEqual([]);
    expect(() => save('algoplay-code', {})).not.toThrow();
  });

  it('rejects invalid solved IDs, duplicates, and themes', () => {
    for (const value of [{}, [id, id], ['unknown'], [null]]) expect(isSolved(value)).toBe(false);
    expect(isCodes({ unknown: 'code' })).toBe(false);
    expect(isTheme('system')).toBe(false);
  });

  it('rejects malformed submission records before the UI reads them', () => {
    for (const value of [null, {}, [null], [{ ...submission, verdict: 'fake' }], [{ ...submission, passed: 4 }], [{ ...submission, runtime: -1 }], [{ ...submission, at: 1e20 }], [{ ...submission, total: 0 }], [{ ...submission, passed: 1.5 }]]) {
      expect(isSubmissions({ [id]: value })).toBe(false);
    }
    expect(isSubmissions({ [id]: Array(21).fill(submission) })).toBe(false);
  });

  it('rejects pane dimensions that would hide content', () => {
    for (const value of [null, [], { x: '44', y: 60 }, { x: 24, y: 60 }, { x: 44, y: 86 }, { x: NaN, y: 60 }]) expect(isSplit(value)).toBe(false);
  });
});
