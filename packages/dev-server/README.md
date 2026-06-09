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

The dev server runs your application as a Bun child process. A `FileWatcher` monitors the configured source directories for changes to `.ts`, `.tsx`, `.js`, `.jsx`, `.tss`, and `termui.config` files.

When a change is detected:

1. The watcher captures the file event.
2. Rapid consecutive saves are coalesced through a short debounce window.
3. The dev server records the reload event and sends a `reload` IPC message to the running child process.
4. The child process gets a short grace period to perform cleanup.
5. The current process is terminated gracefully (with a force-kill fallback if necessary).
6. A fresh Bun child process is spawned using the same entry file.
7. A temporary reload banner is displayed, and development continues automatically.

This approach provides fast feedback while avoiding stale processes and incomplete cleanup between reloads.

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

| Variable | Value | Purpose |
|----------|-------|---------|
| `TERMUI_DEV` | `"1"` | Enables development-specific behavior such as debug overlays, verbose logging, and other development helpers. |
| `NODE_ENV` | `"development"` | Indicates that the application is running in development mode. |

Example:

```ts
if (process.env.TERMUI_DEV === '1') {
    // Enable development-only features
}
```

## Troubleshooting

### Changes are not reloading

- Make sure you started your app with `npm run dev` or `termui-dev`.
- Verify that the modified files are inside the watched directories.
- The watcher only reacts to supported source and configuration files.

### The app does not restart

- Save the file completely before expecting a reload.
- Check for syntax errors that might prevent the child process from starting.
- Restart the dev server if the watcher was interrupted unexpectedly.

### Environment variables are missing

The dev server automatically starts the child process with:

- `TERMUI_DEV=1`
- `NODE_ENV=development`

You normally do not need to set these manually.

## Devtools inspector

The dev server includes a runtime inspector that shows your widget tree, hook state, and timer pool health. Connect to it on the default port while your app runs.

All new widget types are supported: Grid, Skeleton, Tree, JSONView, DiffView, CommandPalette, NotificationCenter, StreamingText, ChatMessage, and ToolCall.

## Custom setup example

You can customize the dev server by specifying your own entry file and debounce interval.

```bash
termui-dev --entry src/index.tsx --debounce 300
```

Example programmatic setup:

```ts
import { DevServer } from '@termuijs/dev-server';

const server = new DevServer({
    rootDir: process.cwd(),
    entry: 'src/index.tsx',
    watchDirs: ['src', 'themes'],
    debounce: 300
});

server.start();
```

## Graceful shutdown

Ctrl+C sends SIGTERM to the dev server, which forwards it to the child process and waits for a clean exit.

## Documentation

Full docs at [www.termui.io/docs/guides/dev-server](https://www.termui.io/docs/guides/dev-server).

## License

MIT
