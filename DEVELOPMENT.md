# TermUI Development Guide

Welcome! This guide is designed to help contributors set up their local development environment, understand the monorepo architecture, adhere to code quality standards, run workspace commands, and follow the validation workflow before submitting a Pull Request.

---

## Prerequisites

Ensure you have the following installed locally:

* **Bun** (>= 1.3.0) — **Mandatory**. Development is Bun-only; do not use `npm`, `yarn`, or `pnpm`.
* **Git** — Latest version.
* **Node.js** (>= 18.0.0) — Only required to verify package compatibility on Node, or if you consume published npm packages.
* **A Modern Terminal** — Supporting ANSI escape codes and unicode characters (e.g., Windows Terminal, iTerm2, Alacritty, GNOME Terminal).

### Windows-Specific Notes
If you are developing on Windows, we highly recommend using **Windows Terminal** with PowerShell. If you run into execution policy errors when running Bun scripts, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 1. Setting Up Your Environment

### Step 1: Fork and Clone the Repository
Fork the repository on GitHub and clone **your fork**:

```bash
git clone https://github.com/<your-username>/TermUI.git
cd TermUI
```

### Step 2: Install Workspace Dependencies
Install dependencies from the repository root:

```bash
bun install
```

> [!WARNING]
> **Never edit `bun.lock` by hand.** If your change requires a dependency, add it to the package's specific `package.json` and run `bun install` at the root. If `bun.lock` contains unrelated changes, revert it before committing using `git checkout origin/main -- bun.lock`.

### Step 3: Run the Initial Build
Build all packages in the correct dependency order:

```bash
bun run build
```

---

## 2. Monorepo Architecture & Package Layout

TermUI is managed as a Bun workspace monorepo. All packages are located under the `packages/` directory, and publish as `@termuijs/<package-name>`.

### Monorepo Boundaries
* **Independence**: Each package is independent. Do not introduce circular dependencies.
* **Dependency Direction**: The dependency graph flows from low-level to high-level:
  * `core` $\leftarrow$ everything else
  * `widgets` $\leftarrow$ `ui`
* **Imports**: Do not import across packages unless explicitly specified in the issue. If package `A` depends on `B`, specify the dependency in `packages/A/package.json` under `dependencies` as `"@termuijs/B": "workspace:*"` and run `bun install` from the root.

For testing guidelines and recommended practices, see
`docs/TESTING_BEST_PRACTICES.md`.

## Typecheck

### Directory Structure of a Package
Each package under `packages/` follows a standardized layout:

```text
packages/<package-name>/
├── src/
│   ├── index.ts               # Public exports (named exports only)
│   └── data/
│       ├── WidgetName.ts      # Main logic
│       └── WidgetName.test.ts # Vitest unit tests (placed next to source)
├── package.json
└── tsconfig.json
```

---

## 3. Core Development Commands

Run all commands from the repository root:

| Command | Action |
|---------|--------|
| `bun install` | Install workspace-wide dependencies and link workspaces. |
| `bun run build` | Builds all packages using `turbo` in dependency order. |
| `bun run lint` | Runs the workspace linter. |
| `bun run typecheck` | Runs TypeScript typechecks across all workspaces. |
| `bun vitest run` | Runs the full Vitest suite. |
| `bun vitest run packages/<name>` | Runs Vitest tests exclusively for the specified package. |

### Running an Example Application
To test your changes visually, you can start any of the example apps. For example, to run the system monitoring dashboard:

```bash
cd examples/dashboard
bun run dev
```

This starts the Bun-native hot-reloading dev server.

---

## 4. Coding Style and Best Practices

To maintain code quality and prevent build breaks, adhere strictly to the following rules:

### TypeScript Strict Mode
* **No `any`**: Type assertions must be avoided. If you must use `any` or a type assertion, include an inline comment explaining why.
* **No `@ts-ignore`**: Use `@ts-expect-error` with a descriptive comment if a compiler error is absolutely unresolvable, but prefer proper type safety.
* **Named Exports Only**: Do not use `export default`. Use named exports for all APIs.

### Node Built-ins
* Always use the `node:` prefix when importing Node built-in modules:
  ```typescript
  import { readFileSync } from 'node:fs'; // Correct
  import { readFileSync } from 'fs';      // Incorrect
  ```

### Widget Development Checklist
If you are adding or modifying a widget:
1. **Canonical Reference**: Read `packages/widgets/src/data/Gauge.ts` and `packages/widgets/src/data/Gauge.test.ts` first. Match their constructor signature and coding patterns.
2. **Dirty States**: Every method modifying a widget's state must call `this.markDirty()`. This triggers the layout engine to queue a re-render.
3. **Key Handling**: Widgets that process keyboard events must implement `handleKey(event: KeyEvent)` using types from `@termuijs/core`.
4. **Key Name Convention**: Key names must be lowercase (e.g., `enter`, `escape`, `left`, `right`, `space`, `up`, `down`). Never use capitalized variants like `Enter` or `ArrowUp`.
5. **Console Logging**: Do not leave `console.log` or debug print statements in the package code. Use proper logging, event emission, or test assertions.
6. **Unicode Capabilities**: Support non-ASCII symbols with an ASCII fallback using the `caps.unicode` capability flag:
   ```typescript
   const borderChar = caps.unicode ? '█' : '#';
   ```

---

## 5. Testing Patterns

We use **Vitest** for testing. All unit tests must be kept in `<FileName>.test.ts` files adjacent to their source code.

### Standard Test Layout
Tests must use the real `Screen` object from `@termuijs/core` to render and assert visual outcomes:

```typescript
import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { MyWidget } from './MyWidget';

describe('MyWidget', () => {
    it('renders the expected text content', () => {
        const screen = new Screen(40, 10);
        const widget = new MyWidget();
        
        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);
        
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('expected text');
    });
});
```

### Mocking Capabilities Safely
Do not mutate capability flags directly (e.g. `caps.unicode = false`), as these are shared global singletons and will leak across tests. Instead, mock them via Vitest's `vi.spyOn`:

```typescript
import { vi, afterEach } from 'vitest';
import { caps } from '@termuijs/core';

afterEach(() => {
    vi.restoreAllMocks();
});

it('falls back to ASCII characters when unicode is disabled', () => {
    vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
    
    // perform test steps and assert ASCII fallback
});
```

---

## 6. Pull Request Checklist

Before submitting a Pull Request, run the validation commands and verify all checks pass locally:

1. **Verify Builds, Tests, and Types**:
   Run the following pipeline from the repository root:
   ```bash
   bun run build && bun vitest run && bun run typecheck
   ```
2. **Follow Conventional Commits**:
   Format your commits using conventional prefixes:
   * `feat(widgets): add Sparkline widget`
   * `fix(core): handle empty event buffer`
   * `test(ui): add Modal unit tests`
   * `docs: expand DEVELOPMENT.md`
3. **Keep Changes Focused**:
   Confine your changes to the relevant package. Do not bundle formatting adjustments, refactors, or unrelated changes into your Pull Request.
4. **Link Issues**:
   Always link the issue you are resolving in the PR description (e.g. `Closes #1618`).
