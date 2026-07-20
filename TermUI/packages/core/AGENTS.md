# @termuijs/core — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds core-specific rules.

## What lives here

The foundation: Screen buffer (`terminal/Screen.ts`), differential Renderer (`terminal/Renderer.ts`), Terminal adapter, layout engine, input parser, event types (`events/types.ts` exports `KeyEvent`), capability flags (`terminal/env-caps.ts` exports `caps`), color and style.

Everything else depends on core. Core depends on nothing.

## Hard rules

- No external runtime dependencies. Core stays dependency-free. Do not add anything to `dependencies`.
- This package is "ask first" for most changes. Changing a shared type (`Screen`, `KeyEvent`, `Color`, `Style`, `Cell`) breaks every other package. Comment on the issue before touching them.
- Changes here run on every frame. Keep the render path allocation-light. Reuse cells, do not rebuild grids per frame.

## Screen contract

- `screen.back` and `screen.front` are `Cell[][]` indexed `[row][col]`.
- `screen.writeString(col, row, str, style)` and `screen.setCell(col, row, partialCell)` are the write paths.
- `screen.cols`, `screen.rows` are getters.
- Wide chars: a width-2 cell is followed by a width-0 continuation cell. Honor this when reading or writing lines.

## Testing

Use a real `Screen`. Mock `caps` with `vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false)` plus `afterEach(() => vi.restoreAllMocks())`. Never assign `caps.unicode = ...`.

Tests must assert real behavior, never `expect(true).toBe(true)`.

## Test command

```bash
bun vitest run packages/core
```
