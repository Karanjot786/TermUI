# @termuijs/jsx — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds jsx-specific rules.

## What lives here

The JSX runtime and React-style hooks: useState, useEffect, useRef, useMemo, useCallback, useReducer, useId, useImperativeHandle, useModal, useSubprocess. Plus the reconciler and the App render loop.

## Adding a hook

1. Most core hooks live in `src/hooks.ts`. Standalone hooks live in `src/hooks/<useName>.ts` with a sibling `<useName>.test.ts`.
2. Export the hook and its types from `src/index.ts`.
3. A hook stores state in a fiber slot. Follow the existing `useState` and `useReducer` patterns exactly: `const idx = fiber.hookIndex++` then `if (idx >= fiber.hooks.length) fiber.hooks.push(...)`.

## Testing hooks

Drive hooks with the fiber test harness, not a real app:

```ts
import { createFiber, setCurrentFiber, clearCurrentFiber } from '../hooks.js';
const fiber = createFiber();
setCurrentFiber(fiber);
const result = useMyHook();
clearCurrentFiber();
```

To test a re-render, reset `fiber.hookIndex = 0` and call again with the same fiber. See `src/hooks/useReducer.test.ts` for the full pattern.

## Rules specific to jsx

- Do not call `Bun.spawn` or import from `bun`. Use `node:child_process` so published code runs on Node.
- Clean up side effects. A hook that opens something registers cleanup so it closes on unmount.
- The render loop lives in `src/render.ts`. Changing it is "ask first" territory.

## Test command

```bash
bun vitest run packages/jsx
```
