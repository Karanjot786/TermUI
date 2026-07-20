# @termuijs/testing

Test renderer for TermUI components. Renders your JSX tree into an in-memory screen buffer, then gives you methods to query the output, simulate key presses, and check what's on screen. No real terminal needed.

The API follows the same pattern as React Testing Library: render, query, interact, assert.

## Install

```bash
npm install --save-dev @termuijs/testing
```

Works with Vitest (recommended) or any test runner.

## Quick start

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@termuijs/testing'
import { useState } from '@termuijs/jsx'
import { Text } from '@termuijs/widgets'

function Counter() {
    const [count, setCount] = useState(0)
    useInput((key) => {
        if (key === '+') setCount((c) => c + 1)
    })
    return <Text>Count: {count}</Text>
}

describe('Counter', () => {
    it('starts at zero', () => {
        const t = render(<Counter />)
        expect(t.getByText('Count: 0')).toBeTruthy()
        t.unmount()
    })

    it('increments on +', () => {
        const t = render(<Counter />)
        t.fireKey('+')
        expect(t.getByText('Count: 1')).toBeTruthy()
        t.unmount()
    })
})
```

## API

| Method | Description |
|--------|-------------|
| `render(element, opts?)` | Render into a virtual screen (default 80x24). Returns a TestInstance |
| `t.getByText(text)` | Find first widget containing that text, or null |
| `t.getAllByText(text)` | Find all widgets containing that text |
| `t.getAllByType(Type)` | Find all widgets of a given constructor |
| `t.lastFrame()` | Current screen as an array of strings (one per row) |
| `t.toString()` | Joined non-empty screen rows |
| `t.renderToString()` | ANSI-free flat string snapshot. Good for assertions and diffs |
| `t.fireKey(key, mods?)` | Simulate a key press. Dispatches to all `useInput` and `useKeymap` handlers in the fiber tree |
| `t.typeText(text)` | Type characters one by one |
| `t.rerender(element?)` | Re-render using fiber-aware reconciliation. Hook state is preserved |
| `t.waitFor(fn, opts?)` | Poll `fn()` until it does not throw. Use for async state updates |
| `t.unmount()` | Clean up all component state. Always call this |

## waitFor

Use `waitFor` for assertions that depend on async state updates.

```typescript
it('loads data', async () => {
    const t = render(<DataList />)

    await t.waitFor(() => {
        expect(t.getByText('Item 1')).toBeTruthy()
    }, { timeout: 2000, interval: 50 })

    t.unmount()
})
```

Default options: `{ timeout: 1000, interval: 10 }`.

## renderToString

Get a clean string snapshot without ANSI escape codes:

```typescript
it('renders correctly', () => {
    const t = render(<StatusBar />)
    const output = t.renderToString()
    expect(output).toContain('Ready')
    t.unmount()
})
```

## Fiber-aware rerender

`rerender()` uses `reRenderComponent` internally. Hook state (`useState`, `useRef`) survives the re-render. You don't need to recreate components or re-supply initial values.

```typescript
it('keeps state on rerender', () => {
    const t = render(<Counter />)
    t.fireKey('+')
    t.fireKey('+')
    t.rerender()                       // hook state preserved
    expect(t.getByText('Count: 2')).toBeTruthy()
    t.unmount()
})
```

## Testing key bindings

`fireKey` dispatches to every handler registered via `useInput` or `useKeymap` in the full fiber tree. You don't need to set focus manually for most tests.

```typescript
t.fireKey('ctrl+s')     // triggers useKeymap({ 'ctrl+s': save })
t.fireKey('enter')      // triggers useInput handlers
```

## Testing with stores

Call `destroy()` on your stores in `afterEach` to reset state between tests.

```typescript
afterEach(() => {
    useCounterStore.destroy()
})
```

## Testing with context

Wrap the component in a Provider to supply test values.

```tsx
const t = render(
    <ThemeCtx.Provider value={testTheme}>
        <MyComponent />
    </ThemeCtx.Provider>
)
```

## Snapshot testing

`lastFrame()` returns the screen as a string array, which works with Vitest's `toMatchSnapshot`:

```typescript
expect(t.lastFrame()).toMatchSnapshot()
```

## Documentation

Full docs at [www.termui.io/docs/testing/overview](https://www.termui.io/docs/testing/overview).

## License

MIT
