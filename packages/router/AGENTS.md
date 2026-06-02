# @termuijs/router — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds router-specific rules.

## What lives here

Screen routing: the `Router` class (`router.ts`), route matching (`route.ts`), and the file-based scanner (`scanner.ts`). Supports typed params, navigation guards, and nested routes.

## Key types

- `Route` and `RouteMatch` live in `src/route.ts`. `RouteMatch` carries `route`, `params`, and `chain` (parent-to-leaf path).
- `matchRoute(path, routes)` is the matcher entry point. `compilePattern(path)` turns a path string into a regex plus param names.
- `Router` (in `src/router.ts`) holds routes, current match, history, and emits `navigate`/`back` events.

## Rules specific to router

- Path params use `[id]` segments. Static and dynamic segments both resolve through `compilePattern`. Do not invent a second matching path.
- Keep `addRoute` and `addRoutes` backward compatible. Existing call shapes must keep working.
- When you add nested-route or guard behavior, write tests inside the existing `describe('Router', ...)` block in `router.test.ts`, not at the file top level.

## Test command

```bash
bun vitest run packages/router
```
