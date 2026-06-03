# @termuijs/testing — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds testing-specific rules.

## What lives here

The in-memory test renderer other packages use in their tests. `render.ts` exposes `render()` returning a screen with query and input helpers: `getByText`, `getAllByText`, `getAllByType`, `fireKey`, `typeText`, `rerender`, `waitFor`, `renderToString`, `lastFrame`. Plus `virtual-clock.ts` for synchronous time control.

## Rules specific to testing

- This package is itself test infrastructure. Other packages depend on it for their tests, so a change here can break many test suites. Run the full suite (`bun vitest run`) after changing it, not just this package.
- Test files here are `.test.tsx` and need `/** @jsxImportSource @termuijs/jsx */` at the top.
- The virtual clock drives the motion timer pool synchronously. Keep `advance`, `tick`, `now`, and the internal `_setInterval` contract intact.
- Query helpers return `null` or `[]` on a miss, never throw. Preserve that.

## Test command

```bash
bun vitest run packages/testing
# after changes here, also run the full suite:
bun vitest run
```
