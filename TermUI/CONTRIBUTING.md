# Contributing to TermUI

Thanks for your contribution. Bug fixes, new widgets, improved docs, typo fixes. All of it helps.

> 🎯 **GSSoC 2026 contributors:** jump to the [GSSoC section](#gssoc-2026) below. Read it before you open any PR.

## Getting started

```bash
git clone https://github.com/Karanjot786/TermUI.git
cd TermUI
bun install
bun run build
bun run test
```

You need **Bun 1.3 or newer**. The project is a Bun workspace monorepo with 14 packages under `packages/`. Node 18+ matters only if you consume published `@termuijs/*` packages from npm. Development is Bun-only.

For local development setup and workspace commands, see [DEVELOPMENT.md](./DEVELOPMENT.md).


## Two-repo layout

Framework code lives here. Docs site lives in a separate repo.

| Repo | Contents | Where to send your PR |
|------|----------|------------------------|
| **TermUI** (this repo) | 14 packages, examples, tests, scaffolding CLI | Bug fixes, new widgets, hooks, refactors, tests |
| **TermUI_Docs** | [termui.io](https://www.termui.io) source: Vite + TanStack + MDX content | Doc typos, new doc pages, website UI changes |

[TermUI_Docs on GitHub](https://github.com/Karanjot786/TermUI_Docs). GSSoC 2026 counts only on **this** repo; the docs repo does not participate.

## Project structure

```
packages/
  core/              Screen buffer, layout engine, input, events
  widgets/           Box, Text, Table, ProgressBar, Spinner, Gauge, VirtualList
  ui/                Select, Tabs, Modal, Toast, Tree, Form, CommandPalette
  jsx/               TSX runtime with hooks
  store/             Global state management
  tss/               Terminal Style Sheets
  router/            Screen routing
  motion/            Spring animations
  data/              System monitoring (CPU, memory, disk, processes)
  testing/           In-memory test renderer
  dev-server/        Hot-reload dev server (uses Bun.spawn)
  quick/             Fluent builder API
  create-termui-app/ Project scaffolding CLI
examples/            Working example apps
```

API docs for each package live on https://www.termui.io. Edit those pages in [TermUI_Docs](https://github.com/Karanjot786/TermUI_Docs).

## Before you write code

1. **Check existing issues.** Someone might already work on it.
2. **Open an issue first** for anything larger than a small fix. Describe your change and your reason. Saves everyone time if the approach needs discussion.
3. **One pull request per change.** Do not bundle unrelated fixes.

## Using AI coding agents

Using Claude Code, Copilot, Cursor, or another agent is welcome. Most PRs here are written with one. The agent does better work when you set it up right.

1. **Point the agent at the rules.** This repo has [`AGENTS.md`](./AGENTS.md) at the root and one in each major package (`packages/widgets/AGENTS.md`, `packages/ui/AGENTS.md`, and others). Claude Code and Copilot read these automatically. Tell your agent to read the root `AGENTS.md` and the one for the package you are working in before it writes code.
2. **Give it the whole issue.** Issues opened with the **AI-ready task** template carry everything the agent needs: the exact files, the API signature, the acceptance criteria, the test command, and a reference file to copy. Paste the full issue to your agent. Do not summarize it.
3. **Run plan mode first** for anything bigger than a one-line fix. In Claude Code, ask for a plan before edits. Read the plan. Confirm it touches only the files the issue names.
4. **You own the PR, not the agent.** Read the diff before you push. Run `bun run build && bun vitest run && bun run typecheck` yourself. If you do not understand a line the agent wrote, do not submit it. PRs that are clearly generated without understanding get the `gssoc:ai-slop` label and earn zero points.
5. **Keep it surgical.** Agents like to refactor nearby code, reformat files, and add features no one asked for. Reject that. One change per PR. If `bun.lock` shows changes unrelated to your work, revert it with `git checkout origin/main -- bun.lock`.

## Writing code

### Style

- TypeScript strict mode. No `any` without an inline comment explaining why.
- No external runtime dependencies in `@termuijs/core`. The core stays dependency-free.
- Use `node:` prefix for built-in modules. Example: `import { readFileSync } from 'node:fs'`.
- Every state-mutating method on a widget calls `this.markDirty()`.

### Tests

Every package uses [Vitest](https://vitest.dev/). Tests live next to source files. Example: `foo.ts` plus `foo.test.ts`.

```bash
# Run all tests
bun run test

# Run tests for a single package
bun vitest run packages/core

# Run a single test file
bun vitest run packages/widgets/src/data/Gauge.test.ts

# Watch mode
bun run test:watch
```

Add a test when you add a widget or fix a bug. Look at existing tests in the same package for patterns.

### Building

```bash
# Build all packages
bun run build

# Build a single package
cd packages/core && bun run build
```

Each package uses tsup. Output goes to `dist/` with both ESM and CJS formats. Published artifacts run on Node 18+ and Bun.

## Pull request process

1. Fork the repo. Create a branch from `main`. Branch name: `type/short-description`. Example: `fix/empty-list-crash`.
2. **⭐ Star the repo** before you open your PR. The `star-check` job fails otherwise.
3. Make your changes.
4. Run `bun run build && bun run test && bun run typecheck`. All three pass.
5. Write your PR title in the form `type: short description`. Example: `fix: handle empty list in VirtualList`.
6. Link your issue: `Closes #123` in the PR body.

You get a review within 48 hours. Small PRs review faster.

## What reviewers look for

- **Does it break existing tests?** A failing `bun run test` blocks merge.
- **Is there a test for your change?** Bug fixes need a test that would have caught the bug. New features need happy-path coverage and one edge case.
- **Does it match existing style?** Read a few files in the same package first.
- **Are there `markDirty()` calls?** Any widget method you write that changes visible state calls `markDirty()`.
- **Is your commit message clear?** Use: `fix(core): prevent layout overflow on zero-width box` or `feat(widgets): add BarChart widget`.

## Commit / PR title format

```
type(scope): short description

Longer explanation if needed.

Fixes #123
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`, `a11y`, `ci`, `build`, `security`

**Scopes:** `core`, `widgets`, `ui`, `jsx`, `store`, `tss`, `router`, `motion`, `data`, `testing`, `dev-server`, `quick`, `create-termui-app`, `examples` (the `website` scope lives in the separate [TermUI_Docs](https://github.com/Karanjot786/TermUI_Docs) repo)

The CI workflow auto-applies a `type:*` label from your PR title prefix. The label counts toward your GSSoC points.

## Adding a new widget

1. Create your file in the right package. `packages/widgets/src/` for base widgets. `packages/ui/src/` for compound widgets.
2. Extend the `Widget` base class from `@termuijs/core`.
3. Implement `_renderSelf(screen: Screen)`.
4. Call `this.markDirty()` in every method you write that changes visual state.
5. Add a `caps.unicode` fallback if you use non-ASCII characters.
6. Add a `caps.motion` guard if your widget animates.
7. Export from the package's `index.ts`.
8. Add tests. See `packages/widgets/src/data/Gauge.test.ts` for the pattern.
9. Add a doc page. The doc site lives in a separate repo: [TermUI_Docs](https://github.com/Karanjot786/TermUI_Docs). Create your MDX in `src/content/`. Register it in `src/content/pages.ts`. Open the PR there.

## Adding a new theme

1. Create your `.tss` file in `packages/tss/src/themes/`.
2. Add the theme name to `BUILTIN_THEMES` in `packages/tss/src/themes/index.ts`.
3. Update the theme count in `packages/tss/package.json` and `packages/tss/README.md`.
4. Update the TSS docs page.

---

# GSSoC 2026

TermUI participates in **GSSoC 2026**. Contribution window: 15 May to 14 August 2026. Below are the rules. Follow them to earn points.

## Step 1: star the repo

This is **required**. PRs from contributors who do not star the repo fail the `star-check` job. The bot comments a reminder.

Star the repo, push any commit (or re-run the workflow), and the `needs-star` label lifts automatically.

## Step 2: pick a good first issue

Browse [open good-first-issues](https://github.com/Karanjot786/TermUI/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

Claim one. Comment:

> I would like to work on this

The bot assigns you. You have **7 days** to open your PR. After that the issue frees up.

**One contributor holds at most 2 open issues.** If you already have 2 assigned, the bot will not assign a third. Open and merge a PR from one of your current issues first. Then claim the next. This keeps work moving and gives every contributor a fair chance.

## Step 3: open your PR

1. Branch name: `type/short-description`.
2. PR title: `type: short description`.
3. Link your issue in the body: `Closes #N`.
4. Fill in the PR template. Every section.
5. All checks pass: `build`, `test`, `typecheck`, `star-check`, `auto-label`.

## Step 4: how points work

Every approved PR earns points from labels. Your reviewer sets `gssoc:approved` plus `level:*` plus `quality:*` after review. `type:*` auto-applies from your PR title.

| Label | Effect |
|-------|--------|
| `gssoc:approved` | +50 base points. Required for any credit. |
| `level:beginner` | +20 difficulty |
| `level:intermediate` | +35 difficulty |
| `level:advanced` | +55 difficulty |
| `level:critical` | +80 difficulty |
| `quality:clean` | x 1.2 multiplier |
| `quality:exceptional` | x 1.5 multiplier |
| `type:docs` | +5 |
| `type:bug`, `type:feature`, `type:testing`, `type:design`, `type:refactor` | +10 |
| `type:accessibility`, `type:performance`, `type:devops` | +15 |
| `type:security` | +20 |

**Formula:** `50 + (difficulty x quality_multiplier) + type_bonus`

**Example:** `gssoc:approved` + `level:intermediate` + `quality:clean` + `type:feature` = `50 + (35 x 1.2) + 10 = 102 pts`.

## Step 5: avoid disqualification

These labels mean **zero points** and lead to disqualification:

- `gssoc:invalid`. Your PR violates rules. Example: no linked issue, broken build, no tests, missing template fields.
- `gssoc:spam`. Duplicate, low-effort, or trivial change.
- `gssoc:ai-slop`. Generated content with no real engagement. Broken code or fabricated reasoning.

**Do not:**
- Submit a PR without claiming the issue first.
- Open multiple PRs for the same issue.
- Use AI to generate code you do not understand.
- Open PRs that only change whitespace or comments.
- Bundle unrelated changes.

**Do:**
- Engage with mentor feedback.
- Test your code locally before you open your PR.
- Read the existing code in your area.
- Ask questions on the [GSSoC Discord](https://gssoc.girlscript.org/getting-started) when stuck.

## Reaching your mentor

- **Quick questions:** GSSoC Discord, project channel, tag `@Karanjot786`.
- **PR-specific questions:** comment on your PR with the exact line and error.
- **Long-form or career:** LinkedIn.

Format your question: *"Hi, I am stuck on issue #42. Tried approach Y. Got error Z."* Specific question = fast answer. "I'm stuck" = no answer.

## Weekly rhythm

| Day | Action |
|-----|--------|
| **Monday** | Pick one issue you finish this week. Claim it. |
| **Wednesday** | Open your PR. Ping your mentor if stuck. |
| **Sunday** | Check your rank on the GSSoC leaderboard. Plan next week. |

---

## Questions?

Open an issue or start a discussion. No question is stupid. The codebase has 14 packages and a lot of moving parts. Ask first, guess later.
