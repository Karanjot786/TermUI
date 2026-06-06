# @termuijs/tss — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds tss-specific rules.

## What lives here

Terminal Style Sheets. The pipeline is `tokenizer.ts` -> `parser.ts` -> `engine.ts`. Plus `AutoThemeProvider.ts`, built-in themes (`themes.ts`, `named-themes.ts`), and token helpers (`tokens.ts`). Six built-in themes ship.

## The pipeline

1. `tokenize(source)` turns a `.tss` string into tokens.
2. `parse(tokens)` builds a `TSSStylesheet` AST (`rules`, `themes`).
3. `ThemeEngine` resolves variables and matches selectors to styles.
4. `compile(source)` flattens to a CSS-like string (used by tests and tooling).

A change to one stage usually needs matching changes in the next. Add tokens in the tokenizer, parse them in the parser, resolve them in the engine.

## Rules specific to tss

- `ThemeEngine` selector matching is flat. It has no descendant combinator. Do not push child selectors as if they were standalone rules; that applies them at the wrong scope. If a feature needs descendant matching, say so on the issue first.
- Keep `ThemeTokens` (the palette) separate from semantic roles. Do not merge them.
- Update the theme count in `package.json` and `README.md` when you add a built-in theme.

## Test command

```bash
bun vitest run packages/tss
```
