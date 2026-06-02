# AGENTS.md

Instructions for AI coding agents (Claude Code, GitHub Copilot, Cursor, Codex) working on TermUI.

Read this file fully before writing code. Read the issue fully before writing code. If the issue links a reference file, read that file first and copy its structure.

## What TermUI is

TermUI is a TypeScript framework for building terminal apps. It is a CLI library, not a web app. There is no DOM, no browser, no React. Output goes to a terminal through a cell grid and ANSI escape codes.

It is a Bun workspace monorepo with 14 packages under `packages/`. Each package publishes as `@termuijs/<name>`.

## Commands

Run all commands from the repo root. Use Bun. Never use npm, yarn, or npx.

```bash
bun install                          # install dependencies
bun run build                        # build all packages
bun run typecheck                    # type check all packages
bun run lint                         # lint all packages
bun vitest run packages/<name>       # test one package (use this while iterating)
bun vitest run                       # test everything
```

Before you open a PR, run these three and make sure they pass:

```bash
bun run build && bun vitest run && bun run typecheck
```

## Package layout

```
packages/
  core/              Screen buffer, layout engine, input, events, caps, KeyEvent
  widgets/           Box, Text, Table, Gauge, Sparkline, Tree, and 40+ display widgets
  ui/                Select, Tabs, Modal, Toggle, Wizard, prompts, compound widgets
  jsx/               JSX runtime and React-style hooks (useState, useEffect, useReducer)
  store/             Global state with selectors and subscribe
  tss/               Terminal Style Sheets: variables, selectors, themes
  motion/            Spring and easing animations; respects NO_MOTION
  router/            Screen routing with typed params and guards
  data/              System data: CPU, memory, disk, processes, network
  testing/           In-memory test renderer
  dev-server/        Hot-reload dev server (Bun-native)
  quick/             Fluent builder API
  create-termui-app/ Project scaffolding CLI
  adapters/          Adapters for external CLI libraries
```

A widget package follows this layout:

```
packages/widgets/src/data/
  Gauge.ts           main widget
  Gauge.test.ts      tests, same directory
```

Public exports go through the package `index.ts`.

## Canonical reference

When you add a widget, read `packages/widgets/src/data/Gauge.ts` and `packages/widgets/src/data/Gauge.test.ts` first. Copy their structure. Match the comment style, the constructor signature shape, the `markDirty()` calls, and the test layout.

## Code style

- TypeScript strict mode. No `any`. No `@ts-ignore`. No type assertions without an inline comment explaining why.
- Named exports only. Never `export default`.
- Use the `node:` prefix for Node built-ins: `import { readFileSync } from 'node:fs'`, not `'fs'`.
- No external runtime dependencies in `@termuijs/core`. Core stays dependency-free.
- Import shared types from `@termuijs/core`. Do not redefine `Screen`, `KeyEvent`, `Color`, `Style`.
- A widget that handles keys takes `handleKey(event: KeyEvent)` from `@termuijs/core`. Key names are lowercase: `enter`, `left`, `right`, `up`, `down`, `space`, `escape`, `tab`, `home`, `end`. Never `Enter`, `ArrowUp`.
- Every state-mutating method on a widget calls `this.markDirty()`.
- Use `caps.unicode` for non-ASCII characters with an ASCII fallback. Example: `caps.unicode ? '█' : '#'`.
- No `console.log` in source files.

## Testing

- Framework: Vitest. Tests sit next to source as `<Name>.test.ts`.
- Run one package: `bun vitest run packages/<name>`.
- Tests must use the real `Screen` from `@termuijs/core`. Do not write a fake screen object.
- Render a widget in a test like this:

```ts
import { Screen } from '@termuijs/core';
const screen = new Screen(40, 10);
widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
widget.render(screen);
const row0 = screen.back[0].map(c => c.char).join('');
expect(row0).toContain('expected text');
```

- To test `caps.unicode` or `caps.motion` behavior, use `vi.spyOn`, never direct mutation:

```ts
import { vi } from 'vitest';
vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
// add afterEach(() => vi.restoreAllMocks());
```

Do not write `caps.unicode = false`. It mutates shared state and leaks across tests.

- Tests must be real. `expect(true).toBe(true)` and `expect(widget).toBeDefined()` are not tests. Assert observable behavior or rendered output.

## Boundaries

### Always

- Run `bun run build && bun vitest run && bun run typecheck` before opening a PR.
- Confine your change to the package the issue names.
- Export new public APIs from the package `index.ts`.
- Follow conventional commits: `feat(widgets): add Gauge widget`, `fix(core): handle empty row`, `test(ui): add Toggle tests`.
- Link the issue in the PR body: `Closes #123`.

### Ask first (comment on the issue before doing it)

- Adding a new dependency.
- Modifying `packages/core/` or any shared type.
- Changing an existing public API signature.
- Adding a new package to the workspace.

### Never

- Use npm, yarn, or npx. Bun only.
- Use `export default`.
- Use `any` without an inline comment.
- Edit `bun.lock` by hand. If your change needs a dependency, add it to the package `package.json` and run `bun install`. Do not hand-edit lockfile entries, and do not commit unrelated lockfile churn (turbo version bumps, removed packages, blank-line shuffles). If `bun.lock` shows changes unrelated to your work, revert it: `git checkout origin/main -- bun.lock`.
- Touch files outside the package scope the issue states.
- Bundle refactors, formatting, or "while I was here" changes into a feature PR. One change per PR.
- Import Bun-only types like `Timer` or `import ... from 'bun'`. Published packages run on Node 18+. Use `ReturnType<typeof setTimeout>` instead of `Timer`.
- Commit with failing tests or TypeScript errors.
- Leave placeholder tests.

## Monorepo rules

- Each package is independent. Do not import between packages unless the issue says to. The dependency direction is: `core` <- everything, `widgets` <- `ui`.
- When an issue says "confined to packages/X", touch nothing else.
- Run `bun install` from the repo root, never from inside a package.
- A new example under `examples/` adds one workspace entry to `bun.lock`. Do not let `bun install` rewrite unrelated parts of the lockfile.

## GSSoC note

This repo runs in GSSoC 2026. PRs need a linked issue, passing checks, and a starred repo. Labels (`gssoc:approved`, `level:*`, `quality:*`) are set by the maintainer after review. Do not add them yourself.
