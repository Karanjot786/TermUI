# @termuijs/dev-server

File-watching dev server for TermUI apps. Save a file, restart the app. Turnaround is under 200ms in most cases.

## Install

```bash
npm install --save-dev @termuijs/dev-server
```

## Usage

```bash
# If you used create-termui-app, it's already wired up:
npm run dev

# Run directly:
npx termui-dev --entry src/index.tsx
```

## How it works

The dev server uses Node's `child_process.fork()` to run your entry file in a child process. When a source file changes:

1. Send a `reload` IPC message to the child process.
2. The child calls `unmountAll()` to clean up all active fibers.
3. Wait up to 200ms for the child to exit cleanly.
4. If it's still alive after 200ms, send SIGTERM.
5. Fork a fresh child with the same entry.

This graceful reload prevents fiber leaks from incomplete unmounts.

## CLI flags

| Flag | Default | What it does |
|------|---------|-------------|
| `--entry <path>` | Auto-detected | Entry file to run |
| `--watch <glob>` | `src/**` | Files to watch |
| `--debounce <ms>` | `200` | Wait time after the last change |

## Auto entry detection

Without `--entry`, the server checks these paths in order:

```
src/index.tsx
src/index.ts
src/main.tsx
src/main.ts
index.tsx
index.ts
```

## Environment variables

The child process receives these:

| Variable | Value | Purpose |
|----------|-------|---------|
| `TERMUI_DEV` | `"1"` | Enable dev-only logging or debug overlays |
| `NODE_ENV` | `"development"` | Standard Node convention |

```typescript
if (process.env.TERMUI_DEV === '1') {
    // enable verbose logging, performance counters, etc.
}
```

## Devtools inspector

The dev server includes a runtime inspector that shows your widget tree, hook state, and timer pool health. Connect to it on the default port while your app runs.

All new widget types are supported: Grid, Skeleton, Tree, JSONView, DiffView, CommandPalette, NotificationCenter, StreamingText, ChatMessage, and ToolCall.

## Graceful shutdown

Ctrl+C sends SIGTERM to the dev server, which forwards it to the child process and waits for a clean exit.

## Documentation

Full docs at [www.termui.io/docs/guides/dev-server](https://www.termui.io/docs/guides/dev-server).

## License

MIT
