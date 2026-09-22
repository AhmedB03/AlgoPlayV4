import { describe,it,expect } from 'vitest';
import { problems } from '../src/problems';
import { evaluateCode } from '../src/judge';
import { buildFrames } from '../src/traces';
describe('reference solutions and judge',()=>{
 for(const p of problems){it(`${p.title} passes every case`,()=>{const results=evaluateCode(p.solution,p);expect(results.length).toBe(p.tests.length);expect(results.every(r=>r.passed)).toBe(true);});it(`${p.title} rejects an incorrect answer`,()=>{expect(evaluateCode(`function ${p.functionName}(){return 'incorrect';}`,p).every(r=>!r.passed)).toBe(true);});}
 it('accepts either valid Two Sum index order',()=>expect(evaluateCode('function twoSum(){return [1,0]}',{...problems[0],tests:problems[0].tests.slice(0,1)})[0].passed).toBe(true));
 it('rejects using the same index twice',()=>expect(evaluateCode('function twoSum(){return [0,0]}',{...problems[0],tests:[{args:[[3,3],6],expected:[0,1],label:'duplicates'}]})[0].passed).toBe(false));
 it('rejects cyclic linked-list output',()=>expect(evaluateCode('function reverseList(head){head.next=head;return head}',problems[1])[0].error).toContain('cycle'));
 it('reports syntax errors',()=>expect(()=>evaluateCode('function ???',problems[0])).toThrow());
 it('rejects wrong function names',()=>expect(()=>evaluateCode('function wrong(){}',problems[0])).toThrow('Define a function'));
});
describe('animation traces',()=>{
 for(const p of problems){it(`${p.title} has a complete trace with valid edges`,()=>{const frames=buildFrames(p.id,p.demo);expect(frames.length).toBeGreaterThan(2);expect(frames.at(-1)?.result).toBeDefined();for(const frame of frames){for(const e of frame.edges){expect(frame.nodes.some(n=>n.id===e.from)).toBe(true);expect(frame.nodes.some(n=>n.id===e.to)).toBe(true);}expect(frame.line).toBeLessThan(p.pseudocode.length);}});}
 it('two sum finds duplicates at distinct positions',()=>expect(buildFrames('two-sum','{"nums":[3,3],"target":6}').at(-1)?.result).toBe('[0, 1]'));
 it('binary search handles a missing target',()=>expect(buildFrames('binary-search','{"nums":[1,3,5],"target":4}').at(-1)?.result).toBe('−1'));
 it('rejects unsorted search data',()=>expect(()=>buildFrames('binary-search','{"nums":[3,1],"target":1}')).toThrow());
 it('reverses every linked-list arrow',()=>{const f=buildFrames('reverse-list','{"values":[1,2,3]}').at(-1)!;expect(f.edges.map(e=>[e.from,e.to])).toEqual([['n1','n0'],['n2','n1']]);});
 it('handles an empty linked list',()=>expect(buildFrames('reverse-list','{"values":[]}').at(-1)?.result).toBe('[]'));
 it('detects a non-palindrome',()=>expect(buildFrames('palindrome','{"text":"hello"}').at(-1)?.result).toBe('false'));
 it('handles a cleaned empty string',()=>expect(buildFrames('palindrome','{"text":"!!!"}').at(-1)?.result).toBe('true'));
 it('detects unmatched brackets',()=>expect(buildFrames('parentheses','{"text":"([)]"}').at(-1)?.result).toBe('false'));
 it('detects leftover opening brackets',()=>expect(buildFrames('parentheses','{"text":"(("}').at(-1)?.result).toBe('false'));
 it('handles cycles and excludes disconnected graph nodes',()=>expect(buildFrames('graph-bfs','{"graph":{"A":["B"],"B":["A"],"C":[]},"start":"A"}').at(-1)?.result).toBe('["A","B"]'));
 it('rejects missing graph neighbors',()=>expect(()=>buildFrames('graph-bfs','{"graph":{"A":["B"]},"start":"A"}')).toThrow());
 it('does not mutate prior frames',()=>{const f=buildFrames('reverse-list',problems[1].demo);expect(f[0].edges[0].from).toBe('n0');expect(f.at(-1)?.edges[0].from).toBe('n1');});
});
