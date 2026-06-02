# @termuijs/widgets — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds widget-specific rules.

## What lives here

Display and data widgets that extend the `Widget` base class: Box, Text, Table, Gauge, Sparkline, Tree, LineChart, and 40+ more. Subfolders group by kind: `display/`, `data/`, `input/`, `feedback/`, `layout/`.

## Adding a widget

1. Create `packages/widgets/src/<group>/<Name>.ts` and `<Name>.test.ts` in the same folder.
2. Extend `Widget` from `../base/Widget.js`.
3. Implement `protected _renderSelf(screen: Screen): void`.
4. Call `this.markDirty()` in every method that changes visible state.
5. Export from `packages/widgets/src/index.ts`.

## Reference

Copy the structure of `src/data/Gauge.ts` and `src/data/Gauge.test.ts`. They show the constructor shape `(label?, style = {}, opts = {})`, the `_renderSelf` layout math, the `caps.unicode` fallback, and the test pattern using a real `Screen`.

## Rules specific to widgets

- `_renderSelf` reads `this._getContentRect()` for `{ x, y, width, height }`. Return early if `width <= 0 || height <= 0`.
- Draw with `screen.writeString(x, y, text, attrs)` and `screen.setCell(x, y, { char, fg })`.
- Non-ASCII chars need a fallback: `caps.unicode ? '█' : '#'`.
- A widget that takes keys uses `handleKey(event: KeyEvent)` with lowercase key names.
- Import `Screen`, `Style`, `Color`, `KeyEvent`, `caps`, `styleToCellAttrs`, `stringWidth` from `@termuijs/core`.

## Test command

```bash
bun vitest run packages/widgets
```
