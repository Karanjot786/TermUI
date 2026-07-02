# TermUI Issue 1619 Report

## Repo

TermUI is a Bun-based monorepo for building terminal user interfaces in TypeScript. It is not a web app. It renders to terminal cell grids and ANSI escape codes, and it is split into packages like `core`, `widgets`, `ui`, `jsx`, `store`, `tss`, `motion`, `router`, `data`, `testing`, `dev-server`, `quick`, `create-termui-app`, and `adapters`.

## Issue

Issue #1619 is titled: Add clipboard read and paste support to core input handling (Wave 7).

The issue asks for two related things:

- Intercept and decode bracketed paste input so pasted text is delivered cleanly.
- Expose clipboard read and write helpers for developers.

## Current State Before the Fix

Before this work, `InputParser` could only emit a paste event when the full bracketed paste sequence arrived in a single input chunk. If the start marker and end marker arrived separately, the paste data was not handled correctly.

The editor also showed 14 TypeScript errors in `packages/core/src/input/InputParser.ts` because VS Code was not resolving Node types like `Buffer`, `NodeJS.ReadStream`, `setTimeout`, and `clearTimeout` inside the core package.

## Changes Made

### 1. Bracketed paste handling

`packages/core/src/input/InputParser.ts` now keeps paste state across chunks:

- It detects `\x1b[200~` as the start of a paste.
- It collects all text until `\x1b[201~` appears.
- It emits one `paste` event with the pasted text.
- It preserves any remaining input after the paste end marker.

### 2. Regression test

`packages/core/src/input/InputParser.test.ts` now includes a test that verifies bracketed paste still works when the start and end markers arrive in separate chunks.

### 3. TypeScript config fix

`packages/core/tsconfig.json` now includes Node typings so VS Code can resolve the Node APIs used by the input parser.

## Expected Output

After the fix:

- Pasting into a TermUI app should emit a single clean paste event instead of being split or ignored.
- Clipboard helpers should remain exported from `@termuijs/core`.
- The TypeScript errors shown in the screenshot should disappear in `InputParser.ts`.

## How To Verify

1. Open `packages/core/src/input/InputParser.ts` in VS Code and confirm the 14 Node-type errors are gone.
2. Run the focused test:
    - `bunx vitest run packages/core/src/input/InputParser.test.ts`
3. Run a compile check:
    - `bunx tsc -p packages/core/tsconfig.json --noEmit`
4. Manually confirm the new regression test passes for split paste chunks.

## Notes

The clipboard read/write API already exists in `packages/core/src/utils/ansi.ts` and is re-exported from `packages/core/src/index.ts`. The main functional gap was the stateful bracketed paste parsing, and the main editor issue was missing Node type resolution in the core package config.
