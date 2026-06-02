# @termuijs/dev-server — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds dev-server-specific rules.

## What lives here

The file-watching dev server that restarts a TermUI app on save. `server.ts` (the `DevServer`), `watcher.ts` (the `FileWatcher`), `cli.ts` (the command entry), `devtools.ts`.

## Rules specific to dev-server

- The dev server is Bun-native at runtime. It uses `Bun.spawn` to run the child app and IPC to message it. This is the one package where Bun APIs are expected. Do not try to make the dev runtime Node-compatible.
- `watcher.ts` debounces `fs.watch` events. Keep the debounce so rapid saves collapse into one restart.
- Signal handling (`SIGINT`, `SIGTERM`) in `cli.ts` must stay so the child process is cleaned up on exit.

## Testing

- Tests mock `globalThis.Bun.spawn` and `node:fs` `watch`. Use `vi.useFakeTimers()` to drive the debounce, and `vi.useRealTimers()` in `afterEach`.
- See `server.test.ts` and `watcher.test.ts` for the mock setup.

## Test command

```bash
bun vitest run packages/dev-server
```
