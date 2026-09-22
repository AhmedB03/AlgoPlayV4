# AlgoPlay

[Live demo](https://algoplay-v4.vercel.app) | [Source](https://github.com/AhmedB03/AlgoPlayV4)

A React coding-practice app that makes algorithms visible: moving pointers, animated blocks, reversed linked-list arrows, stack operations, and graph traversal.

## Run locally

Requires Node.js 22.12+ (or 20.19+).

```sh
npm install
npm run dev
```

Open http://localhost:5173. For a production check:

```sh
npm test
npm run build
npm run preview
```

## Included problems

| Problem | Pattern |
| --- | --- |
| Two Sum | Arrays and hash maps |
| Reverse Linked List | Linked lists and pointer reversal |
| Valid Palindrome | Strings and two pointers |
| Binary Search | Divide the search space |
| Valid Parentheses | Stacks |
| Graph Breadth-First Search | Graphs and queues |

Each problem has an original explanation, constraints, examples, hints, an analogy, starter JavaScript, a reference solution, test cases, and an animated walkthrough. The graph exercise handles cycles and disconnected nodes. The linked-list runner uses actual nodes with `val` and `next` properties.

## A 90-second demo

1. Open Two Sum, press Play, and show how the pointer and matching blocks move.
2. Select Reverse Linked List, use focus mode, and show arrows turning around.
3. Select Graph Breadth-First Search and watch the moving visitor and queue.
4. Click Load solution, then Submit. Explain the test results and saved progress.
5. Edit an animation input to show that the walkthrough is generated from the data.

## Architecture

- React + TypeScript + Vite
- Motion for continuous SVG and layout animation
- CodeMirror for the JavaScript editor
- Dedicated Web Worker for execution with a 3-second termination limit
- Vitest for judge and animation correctness
- Local browser storage for code drafts and solved status

`src/problems.ts` contains lesson content, starter code, reference solutions, and tests. `src/traces.ts` generates deterministic reference-algorithm traces from validated custom input. `src/App.tsx` animates objects between trace states. `src/judge.ts` validates function output and adapts linked-list inputs and outputs.

Animations describe the reference algorithm; they do not instrument arbitrary user code. Run executes two sample tests; Submit executes the full included suite. Animation inputs are size-limited for legibility. The editor executes JavaScript only. There is no account system, backend, remote judge, or cloud progress sync. The worker keeps accidental infinite loops off the UI thread; this is a local learning runner, not a hardened multi-tenant sandbox. Do not add secrets to the frontend or execute untrusted imported code.

## Deploy to Vercel

Import this repository into Vercel. The included `vercel.json` selects Vite, builds with `npm run build`, and serves `dist`. No environment variables or paid services are required. Alternatively:

```sh
npx vercel login
npx vercel --prod
```

Keep `.vercel`, `.env` files, `node_modules`, and `dist` out of source control. The original `filename.txt` location marker is preserved locally and excluded from the repository.

## Accessibility

Keyboard-operable controls, labeled animation controls and editor, native focus-trapped dialogs, visible focus rings, reduced-motion support, text explanations alongside visual state, and responsive layouts. Code and completion data belong to the current browser and device.

