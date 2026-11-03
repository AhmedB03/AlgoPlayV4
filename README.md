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

Each problem has an original explanation, constraints, examples, hints, an analogy, Python and JavaScript starter code, a reference solution, test cases, and an execution trace of the code in the editor. The graph exercise handles cycles and disconnected nodes. The linked-list runner uses actual nodes with `val` and `next` properties.

## A 90-second demo

1. Open Two Sum. Python 3 is the default; JavaScript is also supported.
2. Write a solution (or explicitly choose Load solution), then Run or Submit.
3. Click Run & visualize. Watch the canvas animate, or scrub through each captured frame. Change your code to an incorrect implementation and
   rerun: the trace follows that implementation, not the reference answer.
4. Switch languages. Drafts are saved separately per problem and language.

## Layout

The workspace follows the LeetCode/NeetCode layout: a tabbed problem pane on the left (Description, Editorial, Visualizer, Submissions), the code editor on the top right, and a Testcase / Test Result console underneath. Drag the dividers to resize panes; the sizes are remembered. Run and Submit sit in the top bar (Ctrl/⌘ + ' and Ctrl/⌘ + Enter). A light/dark theme toggle is in the top-right corner.

## Architecture

- React + TypeScript + Vite
- Motion for continuous SVG and layout animation
- CodeMirror for the Python and JavaScript editor (lazy-loaded when the workspace opens)
- Dedicated Web Worker for execution with a 3-second termination limit
- Vitest for judge and animation correctness
- Local browser storage for code drafts, submissions, solved status, theme, and pane sizes

`src/problems.ts` holds lesson content and JavaScript examples; `src/languages.ts`
holds Python starters and examples. `src/runner.worker.ts` executes submissions.
Python runs through Pyodide 0.27.7 (CPython/WebAssembly) downloaded from jsDelivr;
the first load needs network access. Loading has a 60-second limit, followed by
a separate 3-second execution limit. JavaScript uses Acorn statement instrumentation;
Python uses `sys.settrace`. Python trace tests require a local Python interpreter
(`PYTHON` can override the executable).

Run checks two samples; Submit checks the full suite. The visualizer captures
**the first test case only**, capped at 500 events with bounded variable snapshots.
State is recorded before an executed statement; Python also records return and
exception events. The main canvas animates arrays and index pointers, stack
pushes/pops, hash-map entries, graph traversal and linked-list connections from
those snapshots. Stable node IDs preserve aliases, detached nodes and duplicate
values when links reverse. The initial canvas is explicitly an input preview;
it does not run the reference solution.

Play/pause, frame stepping, scrubbing, speed controls and an expanded canvas
support exploration. Reduced-motion mode disables automatic playback and motion
transitions. Inspect variables & source exposes the full bounded snapshot and
lets you bind a different sequence or an extra integer index pointer. Automatic
bindings recognize common names such as `left`, `right`, `i`, `stack`, `queue`
and `seen`; arbitrary code remains inspectable but is not automatically understood
as a new data structure. The stage shows up to 30 sequence cells, 10 linked nodes,
14 graph nodes and 10 map/stack items. Async JavaScript and external Python
packages are not supported. The former reference walkthrough is not wired into
this UI.

Workers terminate on timeout, navigation, or language changes. Editing marks an
existing trace stale. This is an educational local runner, not a hardened sandbox.
There is no account system or cloud sync. Existing JavaScript drafts are retained.

## Deploy to Vercel

Import this repository into Vercel. The included `vercel.json` selects Vite, builds with `npm run build`, and serves `dist`. No environment variables or paid services are required. Alternatively:

```sh
npx vercel login
npx vercel --prod
```

Keep `.vercel`, `.env` files, `node_modules`, and `dist` out of source control. The original `filename.txt` location marker is preserved locally and excluded from the repository.

## Browser navigation regression check

```sh
npx playwright install chromium
npm run dev
# In another terminal, while the app is running:
node scripts/check-navigation.mjs
```

Set `APP_URL` for a different preview address. `BROWSER_CHANNEL=msedge` or
`chrome` uses an installed browser instead of the bundled Chromium. The check
holds a submission open with a test worker, leaves via Back or hash changes,
and verifies termination, timeout cancellation, no saved phantom submission,
and a usable workspace after returning. Each case uses fresh browser storage.

## Visual execution regression check

With the local dev server running:

```sh
node scripts/check-visuals.cjs
node scripts/check-playback.cjs
```

The browser check runs all six problems in Python and JavaScript, checks changing
array values from deliberately wrong code, reversed heap edges, stack growth and
pops, graph nodes, stale recordings, expanded mode and mobile overflow. It uses
the same `APP_URL` and `BROWSER_CHANNEL` settings as the navigation check.
`SCREENSHOT_DIR` optionally saves screenshots of the actual scenes.

## Accessibility

Keyboard-operable controls, labeled animation controls and editor, native focus-trapped dialogs, visible focus rings, reduced-motion support, text explanations alongside visual state, and responsive layouts. Code and completion data belong to the current browser and device.
