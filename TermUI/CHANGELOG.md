# Changelog

All notable changes to TermUI are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

---

## [0.1.5] - 2026-05-26

Full migration from Node.js + pnpm to Bun. Bun 1.3+ is now the sole development runtime. Published packages still ship Node-compatible ESM/CJS so npm consumers on Node 18+ remain unaffected. 600 tests still pass; build, dev-server, and all 6 examples verified end-to-end under Bun.

### Changed

#### Runtime and package manager

- **Bun replaces Node + pnpm** for development, builds, tests, dev-server, examples, scaffolding, and CI. Node is no longer required for any dev workflow.
- **`bun install` replaces `pnpm install`.** Lockfile changed from `pnpm-lock.yaml` to `bun.lock` (text format, diff-friendly).
- **Workspace declaration** moved from `pnpm-workspace.yaml` to the root `package.json` `workspaces` field.
- **Root `package.json`** sets `packageManager: bun@1.3.14` and `engines: { bun: ">=1.3.0" }`.
- **`bunfig.toml`** added for install + lockfile configuration.

#### @termuijs/dev-server

- **`Bun.spawn()` replaces `child_process.fork()`.** The `--loader tsx` flag is gone since Bun runs `.ts`/`.tsx` natively.
- **IPC wiring** moved from `child.on('message')` to the `ipc:` callback at spawn time.
- **Exit handling** moved from `child.on('exit')` to the `child.exited` Promise.
- **Alive check** uses `!child.killed && child.exitCode === null` instead of `child.connected`.
- **`DevServerOptions.nodeFlags` renamed to `bunFlags`.** Flags are prepended to the entry file in the `cmd` array.
- **`cli.ts` shebang** changed to `#!/usr/bin/env bun`.

#### create-termui-app

- **Generated `package.json` scripts** switched to Bun: `dev: bun --watch ...`, `start: bun dist/index.js`.
- **`tsx` removed from template `devDependencies`.** Replaced with `@types/bun`.
- **Generated `engines`** field set to `{ bun: ">=1.3.0" }`.
- **Scaffolding output** now prints `bun install` and `bun run dev` as the next-step hints.

#### Examples

- All 6 examples (`dashboard`, `jsx-dashboard`, `showcase`, `system-monitor`, `todo-app`, `widget-gallery`) switched from `tsx`/`npx tsx` to Bun.
- New `dev` script in each example using `bun --watch src/index.*`.
- `tsx` removed from each example's devDependencies.

#### Website

- `prebuild` and `build` scripts switched from `node` to `bun`.
- `scripts/generate-llm-docs.mjs` shebang changed to `#!/usr/bin/env bun`.

#### Per-package configuration

- All 11 library packages (core, data, jsx, motion, quick, router, store, testing, tss, ui, widgets) now declare `engines: { bun: ">=1.3.0", node: ">=18.0.0" }`. The Node entry remains because published `dist/` artifacts still target Node 18+ ESM/CJS for npm consumers.
- `dev-server` and `create-termui-app` are Bun-only at runtime (`engines: { bun: ">=1.3.0" }` with no `node` field).

#### CI

- **GitHub Actions workflow** replaced `pnpm/action-setup` + `actions/setup-node` with `oven-sh/setup-bun@v2`.
- Pipeline: `bun install --frozen-lockfile` → `bun run build` → `bun vitest run` → `bun run typecheck`.

#### Testing

- Test runner stays at **Vitest** (preserves `vi.stubEnv`, `vi.mock`, `vi.resetModules` APIs used by `Spinner.test.ts` and `Sparkline.test.ts`).
- Root scripts use `bun vitest run` (Bun as script runner, vitest's standard worker pool).
- The `--bun` flag is intentionally NOT used; the worker pool hangs on this suite size. Documented in `CLAUDE.md` for future contributors.

### Removed

- `pnpm-workspace.yaml` and `pnpm-lock.yaml` deleted.
- `tsx` dependency removed from root, dev-server, all 6 examples, and scaffolded project templates.
- `packageManager: pnpm@9.15.0` removed from root `package.json`.

### Fixed

- `_killChild()` now guards `kill('SIGTERM')` in a try/catch in case the child already exited.
- `_handleChange()` now checks `child.exitCode === null` (not only `!killed`) before sending IPC reload, avoiding a send on a naturally-exited child.

### Verification

- Build: **20/20 packages successful** (13.9s clean, 67ms cached).
- Tests: **600/600 passing across 58 files in 3.54s**.
- Typecheck: **14/14 packages successful**.
- All 6 examples boot under Bun with clean SIGWINCH + SIGTERM handling.
- Caps fallback paths (NO_UNICODE / NO_MOTION / NO_COLOR) confirmed working in CI mode.
- Dev-server end-to-end: file change → IPC reload signal → child exit code 0 → respawn confirmed.
- Real-pty test (via `script` + `expect`): alt-screen enter/exit, cursor hide/show, sync-output (CSI 2026), SIGWINCH delivery, raw byte input (including `0x03`) all confirmed working under Bun.
- Manual interactive verification: tab switching (1-5), theme cycle (t), and quit (q) all work in a real terminal under Bun.

---

## [0.1.4] - 2026-05-09

This release adds the focus system, 24 new widgets, 4 new UI inputs, 7 data hooks, imperative prompts, a notification center, motion-preference support, WCAG color utilities, and testing improvements. Total tests: 598.

### Added

#### @termuijs/core

- **Timer pool** - `timerPoolSubscribe(ms, fn)` lets animations and intervals share one underlying `setInterval`. Reduces CPU usage when multiple timers run at the same frame rate.
- **Capability flags** - `caps` object with `caps.unicode`, `caps.motion`, and `caps.color`. Evaluated once at module load from `NO_UNICODE`, `NO_MOTION`, and `NO_COLOR` environment variables.
- **WCAG color utilities** - `contrastRatio(fg, bg)`, `meetsAA(fg, bg)`, `meetsAAA(fg, bg)`. Use them to verify accessible color combinations.
- **String utilities** - `stringWidth`, `truncate`, `wordWrap`, `stripAnsi`. CJK-aware; handles ANSI escape sequences in width calculations.

#### @termuijs/jsx

- **`useKeymap(bindings)`** - Declarative key binding hook. Cleaner than chained `useInput` checks. Multiple calls in one component are additive. Cleanup runs on unmount.
- **`useMotion()`** - Returns `{ prefersReducedMotion }`. Reads `caps.motion` so components skip timer-based animations when `NO_MOTION=1`.
- **`ErrorBoundary`** - Wraps any subtree. Caught errors render a fallback instead of crashing the app. `boundary.reset()` clears error state and re-renders children.
- **Focus system** - Four hooks for keyboard-accessible interfaces:
  - `useFocusManager()` - Owns the global focus state. Mount at the app root.
  - `useFocus({ id, autoFocus? })` - Reads and sets focus per widget.
  - `useFocusTrap(ids[])` - Traps Tab and Shift+Tab within an array of IDs. Use inside modals and dialogs.
  - `useKeyboardNavigation({ items, loop?, pageSize? })` - Standard arrow key list navigation with Home, End, PgUp, PgDn.
- **Fiber identity reuse** - The reconciler reuses existing fiber instances when component type and tree position both match. `useState` and `useRef` values survive parent re-renders. Animated components no longer reset on sibling updates.

#### @termuijs/widgets

New display widgets:

- `StreamingText` - Typewriter effect. Respects `caps.motion`; outputs instantly when `NO_MOTION=1`.
- `ChatMessage` - Chat bubble with role-aware styling for `user`, `assistant`, and `system` roles.
- `ToolCall` - AI tool call display with status indicator and collapsible args and result.
- `JSONView` - Collapsible, keyboard-navigable JSON tree viewer.
- `DiffView` - Unified diff viewer with colored add and remove lines.
- `BigText` - Large ASCII art banner text. Built-in 5x3 character map; no external dependencies.
- `Gradient` - Text with per-character 256-color gradient between two colors.

New layout widgets:

- `Card` - Bordered container with optional title in the border.
- `ScrollView` - Height-bounded scrollable container. Arrow keys, PgUp, PgDn to scroll.
- `Center` - Centers a single child horizontally, vertically, or both.
- `Columns` - Evenly-split column layout from an array of widgets.
- `Sidebar` - Navigable sidebar with items, badges, and active highlight.
- `KeyValue` - Aligned key: value pairs with configurable separator and colors.
- `Definition` - Term (bold) and definition (normal) stacked pairs.
- `Banner` - Full-width alert with title, body, and variant color.
- `StatusMessage` - Compact icon and message. Icons respect `caps.unicode` (uses ASCII fallbacks when `NO_UNICODE=1`).
- `Grid` - CSS-grid-style layout. Items flow left-to-right and wrap every N columns.

New chart widgets:

- `LineChart` - ASCII line plot with labeled X/Y axes and multi-series support. Uses unicode plot characters with ASCII fallbacks.
- `HeatMap` - 2D matrix with color-scale shading and row and column labels. Unicode shading with ASCII fallbacks.

New feedback widgets:

- `Skeleton` - Animated loading placeholder. `pulse` and `shimmer` variants. Respects `caps.motion`.
- `MultiProgress` - Multiple labeled progress bars in one widget.
- `CommandPalette` - Searchable, filterable command menu.

Earlier additions:

- `Tree` - Collapsible tree for hierarchical data.
- `BarChart` - Horizontal or vertical bar chart with grouping support.

#### @termuijs/ui

- **`NotificationCenter`** - Floating notification stack. Mount once at the app root.
- **`useNotifications()`** - `notify(message, { type, duration })` and `dismiss(id)`. Returns notification IDs. Pass `duration: 0` for persistent notifications.
- **Imperative prompts** - `prompt.text()`, `prompt.confirm()`, `prompt.select()`, `prompt.multiSelect()`. All return Promises. A focus trap is applied automatically while the prompt is open.
- **`PasswordInput`** - Text input with character masking. Alt+V toggles visibility.
- **`NumberInput`** - Digits and decimal only. Arrow keys step by configurable amount. Rejects non-numeric input.
- **`PathInput`** - Text input with Tab-completion from the file system via `fs.readdirSync`.
- **`KeyboardShortcuts`** - Renders a grouped grid of `KeyBinding[]` entries with labeled key boxes.

#### @termuijs/store

- **`batch(fn)`** - Groups multiple `setState` calls into one reconciler pass. Flushes all queued updates in a single microtask.

#### @termuijs/tss

- **`ThemeTokens` type** - `Record<string, string>` keyed by CSS variable names.
- **Named token exports** - `draculaTheme`, `nordTheme`, `catppuccinTheme`, `monokaiTheme`, `solarizedTheme`, `tokyoNightTheme`, `oneDarkTheme`. Use these directly without the TSS engine.
- **`tokensToTSS(name, tokens)`** - Converts a token object to a TSS `@theme` block string. Bridge between the token format and the engine format.
- **`AutoThemeProvider`** - Detects terminal background color via OSC query and selects the closest theme. Accepts a `fallback` prop. Skips detection when `caps.color` is false.
- **`useTheme()`** - `{ theme, setTheme, availableThemes }`. Switch themes at runtime from any component.

#### @termuijs/data

- **Reactive hooks** - `useCpu(ms?)`, `useMemory(ms?)`, `useDisk(ms?)`, `useNetwork(ms?)`, `useTopProcesses(n, ms?)`, `useSystemInfo()`, `useHttpHealth(urls, ms?)`. All hooks register interval cleanup on unmount.

#### @termuijs/motion

- **`caps.motion` guard** - `animateSpring` and `transition` skip to their final value immediately when `NO_MOTION=1`. No animation loop runs.
- **Timer pool** - Animations now use `timerPoolSubscribe` instead of raw `setTimeout`. Multiple simultaneous animations share one underlying timer.

#### @termuijs/testing

- **`waitFor(fn, opts?)`** - Polls `fn()` until it does not throw. Default `{ timeout: 1000, interval: 10 }`. Use for async state assertions.
- **`renderToString()`** - Returns an ANSI-free flat string snapshot of the current widget state.

#### @termuijs/quick

- New builders: `jsonView`, `diffView`, `streamingText`, `chatMessage`, `toolCall`, `commandPalette`, `multiProgress`, `grid`.
- Re-exports: `useKeymap`, `useMotion`, `useTheme`, `useNotifications`, `useAsync`, `useCpu`, `useMemory`, `useDisk`, `useNetwork`, `useTopProcesses`, `useSystemInfo`, `useHttpHealth`.
- App root now wraps in `AutoThemeProvider` and `ErrorBoundary` automatically.

#### @termuijs/router

- Route components are now wrapped in `ErrorBoundary`. A screen crash shows an error UI instead of killing the app.
- `push()`, `replace()`, and `back()` call `unmountAll()` before mounting the new screen. No stale fibers remain after navigation.

#### @termuijs/dev-server

- Graceful reload: sends a `reload` IPC message to the child process before killing it. The child calls `unmountAll()` and exits cleanly within a 200ms grace period.
- Devtools inspector now supports all new widget types: Grid, Skeleton, JSONView, DiffView, CommandPalette, NotificationCenter, StreamingText, ChatMessage, ToolCall.

#### create-termui-app

- All four templates updated to use `useKeymap`, `AutoThemeProvider`, and `ErrorBoundary`.
- Dashboard template uses Grid layout and `useNotifications`.
- Interactive tool template uses `prompt.confirm` for destructive actions and `useMotion` guards around animations.

### Fixed

- **`@termuijs/core` App.ts** - `requestRender()` now checks `isDirty` before running the full layout pass. Frames with no state changes no longer trigger layout computation.
- **`@termuijs/core` Terminal.ts** - Changed `process.once('uncaughtException', ...)` to `process.on(...)`. The terminal now restores correctly after any uncaught exception, not only the first one.
- **`@termuijs/widgets` Spinner** - No longer uses a manual `tick` interval. Uses `timerPoolSubscribe` and checks `caps.motion`. Static character output when `NO_MOTION=1`.
- **`@termuijs/widgets` Sparkline** - Falls back to numeric ASCII characters (`1`-`8`) when `NO_UNICODE=1`. Previously output garbled unicode block elements in non-unicode terminals.
- **`@termuijs/widgets` List, VirtualList** - Selection prefix `'▸ '` now falls back to `'> '` when `NO_UNICODE=1`.
- **`@termuijs/widgets` Gauge** - Fill and empty characters fall back to ASCII when `NO_UNICODE=1`.
- **`@termuijs/widgets` StreamingText** - Guards `timerPoolSubscribe` call with `caps.motion` check.
- **`@termuijs/ui` Select, Tabs, Modal, Toast, MultiSelect, Tree, CommandPalette** - All unicode and emoji characters now have `caps.unicode` guards with ASCII fallbacks. Previously output garbled characters in CI environments and non-unicode terminals.
- **`@termuijs/data` http.ts** - `_latencyHistory` now capped at 100 entries per URL. Previously grew without bound.
- **`@termuijs/testing` `rerender()`** - Now uses `reRenderComponent()` internally to preserve fiber state. Previously discarded hook state on every re-render call.
- **`@termuijs/testing` `fireKey()`** - Now uses `collectInputHandlers()` to walk the full fiber tree. Previously only dispatched to the root component's handlers.

### Changed

- **`@termuijs/tss`** - Documentation updated from "five built-in themes" to six (Solarized was present but unlisted).
- **All packages** - README files updated to document new features.
- **Website** - 15 new documentation pages added. 9 existing pages updated. All new features are now documented.
- **Tests** - 242 new tests across all packages. Total: 598 tests, all passing.

---

## [0.1.3] - 2026-04-07

### Added

- **`homepage` field** added to all 13 package `package.json` files, pointing to the relevant docs page on `termui.io`.
- **`repository` field** added to all 13 package `package.json` files, linking to the GitHub monorepo.
- **Root `package.json`** — added `homepage` (`https://www.termui.io`) and `repository` fields.

### Changed

- **`@termuijs/store` and `@termuijs/testing`** version aligned with the rest of the monorepo (`0.1.0` → `0.1.3`).

### Documentation

- **All package READMEs** — added `## Documentation` section before `## License` with a direct link to the relevant docs page on `termui.io`.
- **Root README** — added docs badge to the header; fixed relative Quick Start link to absolute `https://www.termui.io/docs/getting-started/quick-start`.
- **`packages/core` README** — fixed wrong docs domain (`termuijs.dev` → `termui.io`).

---

## [0.1.2] — 2026-04-02

### Fixed

- **JSX `useInterval`** no longer creates duplicate timers on re-render. Re-renders update the callback ref instead of spawning a new `setInterval`.
- **JSX `useEffect`** cleanup tracking rewritten. Effects update existing records in-place on re-render. Cleanups run before the effect re-executes.
- **JSX reconciler** memory leak fixed. Old widgets are deleted from `_instanceMap` when a component re-renders, preventing the map from growing forever.
- **`@termuijs/data` `tail.ts`** file descriptor leak fixed. `fs.closeSync(fd)` now runs inside a `try/finally` block.
- **`@termuijs/data` `tail.ts`** watcher cleanup fixed. `stop()` now calls `fs.unwatchFile()` immediately instead of waiting for the next change event.
- **`@termuijs/data` `cpu.ts`** double-call inconsistency fixed. Added a cached delta with a short TTL so `cpu.percent` and `cpu.perCore` return data from the same sample.
- **`@termuijs/data` `disk.ts`** macOS percent column detection fixed. Column index is now `7` on macOS and `4` on Linux (was `4` for both).
- **`@termuijs/data` `http.ts`** response body now consumed with `await res.text()` to prevent connection leaks.
- **`@termuijs/router`** history no longer grows unbounded. Added `maxHistory` option (defaults to 100). The array is trimmed with `slice()` on each push.
- **`@termuijs/tss` watcher** no longer uses `require()` in ESM. `readdirSync` is imported at the top of the file alongside other `node:fs` imports.
- **`@termuijs/tss` watcher** `_reload` now calls `loadAll()` to re-merge all `.tss` sources instead of replacing the stylesheet with a single file.
- **`@termuijs/tss` engine** `_parseColor` now delegates to `parseColor()` from `@termuijs/core` instead of duplicating a limited subset of color parsing.
- **`@termuijs/ui`** all 9 compound widgets (Select, MultiSelect, Tabs, Modal, Toast, Tree, Form, CommandPalette, ConfirmDialog) now call `markDirty()` in every state-mutating method.
- **`@termuijs/ui` Form** submit button navigation separated from field navigation. `markDirty()` added to `nextField()` and `prevField()`.
- **`@termuijs/ui` Modal** no longer accesses private `_rect` and `_renderSelf` on content widgets.

### Changed

- **Documentation overhaul.** 15 doc pages rewritten to match actual APIs. Removed wrong constructors (`new Style()`, `new Layout()`, `new App()`), phantom methods (`beforeEach`, `onRoute`, `parse`), and incorrect theme names.
- **`@termuijs/data` description** corrected across README, `package.json`, website, and docs — from "reactive data sources" to "system monitoring: CPU, memory, disk, network, processes."
- **`@termuijs/tss` `package.json`** and README updated from "five built-in themes" to "six" (Solarized was missing from the list).
- **Router README** fixed dynamic route syntax from `:id` to `[id]`.
- **Root README** test badge updated from 307 to 356. Removed `**NEW**` and `← NEW` badges. Fixed `app.onKey()` → `app.events.on('key')`.
- **Website navigation** rewritten. Removed 9 dead sidebar links. Added missing sections for Store, Testing, JSX, Quick, Unicode.
- **Website package cards** added `@termuijs/store` and `@termuijs/testing`. Fixed `@termuijs/data` description.

### Added

- **`@termuijs/quick` documentation** — new page covering reactive values, widget shorthands, layout helpers, and the fluent `AppBuilder`.
- **String utilities documentation** — new page covering `stringWidth`, `truncate`, `wordWrap`, `stripAnsi`.
- **Tests** — 49 new tests across store, data, quick, jsx (hooks, context, memo), and create-termui-app. Total: 356 tests, 44 test files, all packages building.

---

## [0.1.1] — 2026-02-14

### Added

- **13 packages** published to npm for the first time under the `@termuijs` scope.
- **`@termuijs/core`** — screen buffer, flexbox layout engine, input parser, event emitter, focus manager, ANSI rendering, CJK-aware string utilities.
- **`@termuijs/widgets`** — Box, Text, Table, ProgressBar, Spinner, Gauge, TextInput, VirtualList.
- **`@termuijs/ui`** — Select, MultiSelect, Tabs, Modal, Toast, Tree, Form, CommandPalette, ConfirmDialog, Divider.
- **`@termuijs/jsx`** — TSX runtime with `useState`, `useEffect`, `useRef`, `useContext`, `useAsync`, `useInput`, `useInterval`, `useMemo`, and `memo()`.
- **`@termuijs/store`** — Zustand-style global state with `createStore`, selectors, `subscribe`, `destroy`.
- **`@termuijs/tss`** — Terminal Style Sheets with variables, selectors, pseudo-classes, and 6 built-in themes (default, cyberpunk, nord, dracula, catppuccin, solarized).
- **`@termuijs/router`** — screen routing with `[id]` dynamic params, history stack, navigation events, file-based route scanning.
- **`@termuijs/motion`** — `stepSpring()`, `animateSpring()`, spring presets (default, stiff, gentle, wobbly, slow, molasses), easing functions, transitions.
- **`@termuijs/data`** — CPU, memory, disk, network, process monitoring. File tailing. HTTP ping.
- **`@termuijs/testing`** — in-memory test renderer with `render()`, `getByText()`, `getAllByType()`, `fireKey()`, `typeText()`, `lastFrame()`, `toString()`.
- **`@termuijs/dev-server`** — file-watching hot-reload via `child_process.fork()`.
- **`@termuijs/quick`** — fluent builder API for rapid prototyping. `app()`, `gauge()`, `table()`, `text()`, `sparkline()`.
- **`create-termui-app`** — project scaffolding CLI with template selection.
- **5 examples** — dashboard, jsx-dashboard, showcase, system-monitor, todo-app.
- **6 built-in themes** — default, cyberpunk, nord, dracula, catppuccin, solarized.
- **Documentation website** — built with Vite + TanStack Router.

---

## [0.1.0] — 2026-02-10

### Added

- Initial framework scaffold with core architecture.
- Scope renamed from `@termui` to `@termuijs`.
