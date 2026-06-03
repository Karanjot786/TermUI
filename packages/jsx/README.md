# @termuijs/jsx

Write terminal apps with JSX and React-style hooks. This package is the TSX runtime for TermUI. It handles component lifecycle, reconciliation, hooks, focus management, and error handling.

## Install

```bash
npm install @termuijs/jsx
```

Requires `@termuijs/core` and `@termuijs/widgets`.

## Setup

Add this to your `tsconfig.json`:

```json
{
    "compilerOptions": {
        "jsx": "react-jsx",
        "jsxImportSource": "@termuijs/jsx"
    }
}
```

## Usage

```tsx
import { render, useState, useEffect } from '@termuijs/jsx'
import { Box, Text } from '@termuijs/widgets'

function App() {
    const [time, setTime] = useState(new Date().toLocaleTimeString())

    useEffect(() => {
        const id = setInterval(() => {
            setTime(new Date().toLocaleTimeString())
        }, 1000)
        return () => clearInterval(id)
    }, [])

    return (
        <Box border="rounded" padding={1}>
            <Text bold>Current time: {time}</Text>
        </Box>
    )
}

render(<App />)
```

## Hooks

| Hook | What it does |
|------|-------------|
| `useState` | Component state. Triggers a re-render when the value changes |
| `useToggle` | Boolean state with `toggle`, `on`, and `off` helpers |
| `useEffect` | Side effects with cleanup. Runs after render, re-runs when deps change |
| `useRef` | Mutable ref that persists across renders without causing re-renders |
| `useInput` | Register a keyboard handler for this component |
| `useKeymap` | Declare named key bindings. Cleaner than `useInput` for multiple keys |
| `useInterval` | Set an interval that auto-cleans on unmount |
| `useContext` | Read a value from the nearest Provider ancestor |
| `useAsync` | Load async data with built-in loading, error, and refetch tracking |
| `useMotion` | Read motion preference. Returns `{ prefersReducedMotion }` |

## useKeymap

Declare key bindings as a map. More readable than chained if-statements. All bindings from multiple `useKeymap` calls in the same component are additive.

```tsx
import { useKeymap } from '@termuijs/jsx'

function App() {
    useKeymap({
        'ctrl+c': () => process.exit(0),
        'q':      () => goBack(),
        '/':      () => openSearch(),
        'ctrl+s': () => save(),
    })

    // Bindings with modifier access
    useKeymap({
        'ctrl+k': (e) => console.log('ctrl+k pressed', e),
    })

    return <Box>...</Box>
}
```

Modifier syntax: `ctrl+`, `alt+`, `shift+`, `meta+`. Combine them: `ctrl+shift+k`.

## useMotion

Read the user's motion preference before starting animations.

```tsx
import { useMotion } from '@termuijs/jsx'
import { timerPoolSubscribe } from '@termuijs/core'

function AnimatedWidget() {
    const { prefersReducedMotion } = useMotion()

    useEffect(() => {
        if (prefersReducedMotion) return
        return timerPoolSubscribe(16, () => tick())
    }, [prefersReducedMotion])

    return <Box>...</Box>
}
```

## useToggle

Manage a simple boolean state with helpers to flip, enable, or disable it.

```tsx
import { useToggle } from '@termuijs/jsx'
import { Box, Text, Button } from '@termuijs/widgets'

function ToggleExample() {
    const [isOpen, controls] = useToggle()

    return (
        <Box>
            <Text>{isOpen ? 'Open' : 'Closed'}</Text>
            <Button onPress={controls.toggle}>Toggle</Button>
            <Button onPress={controls.on}>Open</Button>
            <Button onPress={controls.off}>Close</Button>
        </Box>
    )
}
```

## ErrorBoundary

Wrap any subtree. Errors show a fallback instead of crashing the app.

```tsx
import { ErrorBoundary } from '@termuijs/jsx'

function App() {
    return (
        <ErrorBoundary
            fallback={(err) => (
                <Box border="single" borderColor="red">
                    <Text color="red">Error: {err.message}</Text>
                </Box>
            )}
            onError={(err) => logError(err)}
        >
            <Dashboard />
        </ErrorBoundary>
    )
}
```

Place one at the app root and one around each major section. Call `boundary.reset()` to clear the error state and re-render children.

## Focus management

Four hooks for building keyboard-accessible interfaces:

```tsx
import {
    useFocusManager,
    useFocus,
    useFocusTrap,
    useKeyboardNavigation,
} from '@termuijs/jsx'

// App root: provides the focus context
function App() {
    const { FocusContext, focus, blur, focused } = useFocusManager()
    return (
        <FocusContext.Provider value={{ focus, blur, focused }}>
            <Screen />
        </FocusContext.Provider>
    )
}

// Individual widget: reads focus state
function Input({ id }) {
    const { isFocused, focus } = useFocus({ id, autoFocus: false })
    return <Box borderColor={isFocused ? 'cyan' : 'white'}>...</Box>
}

// Modal: traps Tab/Shift+Tab within a set of IDs
function Modal({ fieldIds }) {
    useFocusTrap(fieldIds)
    return <Box>...</Box>
}

// List: standard arrow key navigation
function List({ items }) {
    const { selectedIndex, select } = useKeyboardNavigation({
        items,
        loop: true,
        pageSize: 10,
    })
    return <Box>...</Box>
}
```

## Context

Share state across the component tree without prop drilling.

```tsx
import { createContext, useContext } from '@termuijs/jsx'

const ThemeCtx = createContext({ primary: '#00ff88', bg: '#0a0a0f' })

function App() {
    return (
        <ThemeCtx.Provider value={{ primary: '#ff0088', bg: '#1a1a2e' }}>
            <Dashboard />
        </ThemeCtx.Provider>
    )
}

function StatusBar() {
    const theme = useContext(ThemeCtx)
    return <Text color={theme.primary}>Ready</Text>
}
```

## memo()

Skip re-renders when props have not changed.

```tsx
import { memo } from '@termuijs/jsx'

const Row = memo(function Row({ name, cpu }) {
    return <Text>{name}: {cpu}%</Text>
})
```

## Fiber identity reuse

The reconciler reuses existing fiber instances when a component type and its position in the tree both match. Hook state (`useState`, `useRef`) survives parent re-renders. Animated components like `Spinner` and `Skeleton` no longer reset when a sibling updates.

## Documentation

Full docs at [www.termui.io/docs/jsx/context](https://www.termui.io/docs/jsx/context).

## License

MIT
