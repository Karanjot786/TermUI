# @termuijs/data — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds data-specific rules.

## What lives here

System data providers and reactive hooks: CPU, memory, disk, processes, network, plus `useFetch`, `useHttpHealth`. Raw providers live in their own files (`cpu.ts`, `memory.ts`). Hooks live in `src/hooks.ts`.

## Adding a hook

1. Add the hook to `src/hooks.ts`.
2. Export the hook and its types from `src/index.ts`.
3. Reactive hooks use `useState`, `useEffect`, `useRef`, `useCallback` from `@termuijs/jsx`.

## Rules specific to data

- Do not import from `bun`. No `Timer` type. Use `ReturnType<typeof setTimeout>` for timer refs. Published code runs on Node 18+.
- Use Web-standard globals (`WebSocket`, `fetch`, `setTimeout`) directly. They exist on both Bun and Node 18+. No import needed.
- Clean up in the `useEffect` return: close sockets, clear timers, abort controllers. Guard async callbacks with an `isMounted` flag.
- A hook test file is `.test.tsx` and needs `/** @jsxImportSource @termuijs/jsx */` at the top, plus `@termuijs/testing` in devDependencies. Render with `render(<Component />)` from `@termuijs/testing`.

## Test command

```bash
bun vitest run packages/data
```
