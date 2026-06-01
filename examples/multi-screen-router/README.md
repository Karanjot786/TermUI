Multi-screen Router Example
===========================

This example demonstrates using the repository-native `@termuijs/router` to build a small multi-screen terminal UI.

Routes
------

- `/` — Home screen (press `i` to go to the items list)
- `/items` — Items list (use Arrow keys to navigate, `Enter` to open an item)
- `/items/:id` — Item details (press `b` to go back)

How to run
----------

Install dependencies at the repo root, then run:

```bash
cd examples/multi-screen-router
bun run dev
```

Navigation
----------

Flow: Home -> Items -> Item Details -> Back

This example uses `router.push(path)` to navigate and `router.back()` to return.
