# 02 · Simple Button

A focusable, clickable button that increments a counter — your first
interactive TermUI widget.

## What you'll learn
- Creating a custom `Widget` subclass (`Button`) with its own `_renderSelf`
- Handling focus state and highlighting the focused element
- Responding to Enter/Space key presses to trigger a click

## Run it
```bash
cd examples/02-simple-button
bun install
bun run start
```

## Expected output
+----------------------------------------+
|                                        |
|          Clicked: 0 times             |
|                                        |
|  +--------------------------------+   |
|  |          Click Me!             |   |
|  +--------------------------------+   |
|                                        |
|  Enter/Space = click . q = quit       |
|                                        |
+----------------------------------------+
Press `Enter` or `Space` to click. Press `q` or `Ctrl+C` to exit.
