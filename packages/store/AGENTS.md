# @termuijs/store — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds store-specific rules.

## What lives here

Global state management: `createStore`, `batch`, selectors, `computed`, middleware, and the persist plugin. All in `src/store.ts` with tests in `src/store.test.ts`.

## API shape

- `createStore(creator, options?)` returns a `useStore` hook with `.getState()`, `.setState()`, `.subscribe()`, `.destroy()`, `.computed()`.
- `setState` notifies listeners only when a value actually changed (`Object.is` bail-out). Preserve this.
- New features are opt-in through the `options` argument. The bare `createStore(creator)` call must keep working unchanged. Backward compatibility is required.

## Rules specific to store

- Use the `node:` prefix for any Node built-in (`node:fs`, `node:path`, `node:os`). The persist plugin reads and writes files; keep it Node-compatible.
- Subscriptions return an unsubscribe function. Honor it.
- `batch()` defers notifications to a microtask. Do not break batching when adding features.

## Testing

- Real timers off by default. Use `vi.useFakeTimers()` for debounce or persist tests and `vi.useRealTimers()` in `afterEach`.
- Clean up files the persist tests write.

## Test command

```bash
bun vitest run packages/store
```
