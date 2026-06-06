# @termuijs/adapters — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds adapters-specific rules.

## What lives here

Adapters that bridge popular external CLI libraries into TermUI. Each adapter lives in its own subfolder: `src/commander/index.ts` is the reference. The package `index.ts` re-exports each adapter.

## Adding an adapter

1. Create `packages/adapters/src/<lib>/index.ts` and `index.test.ts`.
2. Export a `use<Lib>` function (or the adapter's main entry) and its result type.
3. Re-export from `packages/adapters/src/index.ts`.

## Rules specific to adapters

- The external library is an optional peer dependency. Add it to `peerDependencies` and mark it optional in `peerDependenciesMeta`. Do not make it a hard runtime dependency.
- Import the external type with `import type`, so the adapter type-checks without forcing the library on consumers who do not use it.
- Adapters run on Node 18+ as well as Bun. No Bun-only imports.
- Follow `src/commander/index.ts` for the shape: a thin function that takes the external object and returns TermUI-friendly data.

## Test command

```bash
bun vitest run packages/adapters
```
