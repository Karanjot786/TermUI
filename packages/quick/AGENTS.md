# @termuijs/quick — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds quick-specific rules.

## What lives here

The fluent builder API for dashboards in ~20 lines. `app.ts` (the `app()` builder and `AppBuilder`), `layout.ts` (`row`, `col`, `grid`, `toWidget`), `widgets.ts` (builder wrappers), `reactive.ts` (reactive value helpers). Re-exports `batch` from `@termuijs/store`.

## Rules specific to quick

- This package is a thin convenience layer over `core`, `widgets`, and `store`. It wraps existing widgets; it does not reimplement rendering. When you add a builder, it wraps a widget that already exists in `@termuijs/widgets`.
- Keep the fluent chain returning `this` so calls stay chainable.
- New builder methods get tests in the matching `*.test.ts` (`widgets.test.ts`, `reactive.test.ts`, `index.test.ts`).
- Do not duplicate a widget here. If the widget does not exist yet, it belongs in `@termuijs/widgets` first.

## Test command

```bash
bun vitest run packages/quick
```
