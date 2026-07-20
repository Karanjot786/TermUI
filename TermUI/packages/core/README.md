# @termuijs/core

The rendering engine at the bottom of the TermUI stack. Screen buffers, flexbox layout, input parsing, events, styling, string utilities, and capability flags. Everything else in the framework builds on this.

## Install

```bash
npm install @termuijs/core
```

## What's in the box

- **Screen** - Double-buffered cell grid. Diffs the previous frame against the new one so only changed cells get written to stdout.
- **LayoutEngine** - Flexbox positioning: `flexDirection`, `flexGrow`, `flexShrink`, `alignItems`, `justifyContent`, percentage sizing. All calculated in character cells.
- **InputParser** - Converts raw stdin bytes into typed `KeyEvent` objects. Handles escape sequences, Ctrl combos, and multi-byte UTF-8.
- **EventEmitter** - Type-safe `on`, `off`, `once`, `emit`. Events bubble from the focused widget up through parents.
- **FocusManager** - Tab cycling between widgets, focus traps for modals, focus groups for arrow key navigation.
- **Style** - Colors (RGB, hex, named), border styles (single, double, rounded, bold), padding, margin.
- **LayerManager** - Z-indexed overlays. Modals and dropdowns render above the base layer without z-fighting.
- **App** - Mounts your widget tree, starts the render loop, and routes input to the focused widget.
- **Timer pool** - Shared tick pool for animations. All intervals share one `setInterval` at 16ms.
- **caps flags** - Runtime capability detection for unicode, motion, and color support.
- **String utilities** - `stringWidth`, `truncate`, `wordWrap`, `stripAnsi` for CJK-aware terminal text.
- **WCAG utilities** - `contrastRatio`, `meetsAA`, `meetsAAA` for accessible color combinations.

## Capability flags

The `caps` object reports what the current terminal environment supports:

```typescript
import { caps } from '@termuijs/core'

caps.unicode  // false when NO_UNICODE=1 — use ASCII fallbacks
caps.motion   // false when NO_MOTION=1  — skip animations
caps.color    // false when NO_COLOR=1   — skip ANSI color codes
```

These are evaluated once at module load. All built-in widgets check them automatically. Use them in your own code to provide ASCII fallbacks:

```typescript
import { caps } from '@termuijs/core'

const bullet = caps.unicode ? '●' : '*'
const bar    = caps.unicode ? '█' : '#'
```

Set `NO_UNICODE=1 NO_MOTION=1` in CI to test ASCII output without a real terminal.

## String utilities

```typescript
import { stringWidth, truncate, wordWrap, stripAnsi } from '@termuijs/core'

stringWidth('你好')                    // 4 (each CJK char = 2 columns)
truncate('Hello World', 8)            // 'Hello W…'
wordWrap('The quick brown fox', 10)   // wraps at word boundaries
stripAnsi('\x1b[32mHello\x1b[0m')    // 'Hello'
```

## WCAG color utilities

```typescript
import { contrastRatio, meetsAA, meetsAAA } from '@termuijs/core'

contrastRatio('#ffffff', '#000000')  // 21
meetsAA('#00ff88', '#0a0a0f')        // true (>= 4.5:1)
meetsAAA('#ffffff', '#333333')       // false (< 7:1)
```

## Event bubbling

Key events start at the focused widget and bubble up through its parents.

```typescript
widget.on('key', (event) => {
    if (event.key === 'enter') {
        event.stopPropagation()
    }
})
```

## Clip regions

Widgets clip their children by default. Nothing renders outside a widget's bounds.

```typescript
screen.pushClip({ x: 5, y: 5, width: 20, height: 10 })
screen.popClip()
```

## Timer pool

Use `timerPoolSubscribe` instead of `setInterval` for animations. All subscribers share one underlying timer, reducing CPU overhead.

```typescript
import { timerPoolSubscribe } from '@termuijs/core'

const unsub = timerPoolSubscribe(16, () => {
    // runs every ~16ms (60fps)
})

// Clean up
unsub()
```

## Documentation

Full docs at [www.termui.io/docs/core/overview](https://www.termui.io/docs/core/overview).

## License

MIT
