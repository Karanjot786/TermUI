# Choosing your API

TermUI provides three distinct ways to build terminal applications. Whether you need absolute control, a React-like developer experience, or a rapid prototyping tool, there is an API for you.

## Summary

| API | Package | Style | Best for... | Complexity |
|-----|---------|-------|-------------|------------|
| **Imperative** | `@termuijs/core` | OOP / Manual | Base widgets, high performance. | High |
| **JSX** | `@termuijs/jsx` | Declarative | Complex apps, interactive state. | Medium |
| **Quick Builder** | `@termuijs/quick` | Fluent / Chained | Dashboards, monitors, prototypes. | Low |

---

## Decision Matrix: Which one should I use?

| If you want... | Use this API |
|----------------|--------------|
| To build a new chart or complex input widget | **Imperative** |
| A React-like workflow with Hooks | **JSX** |
| To display system stats in < 30 lines | **Quick Builder** |
| Maximum control over the render loop | **Imperative** |
| Seamless focus management and navigation | **JSX** |

---

## 1. Imperative API (@termuijs/core)

The Imperative API is the foundation of TermUI. You work directly with classes and manage the tree and state manually. This is the lowest-level way to use the framework.

### When to pick it
- You are building a **base widget** (like a new chart or input type) that others will use.
- You need the **absolute lowest overhead** and maximum performance.
- You prefer **Object-Oriented Programming** and want to manage state in class properties.

### Example: Imperative Counter

```typescript
import { App, type KeyEvent } from '@termuijs/core';
import { Box, Text, Widget } from '@termuijs/widgets';

class Counter extends Widget {
    private _count = 0;
    private _label: Text;

    constructor() {
        super({ border: 'round', padding: 1 });
        
        this._label = new Text(`Count: ${this._count}`, { bold: true });
        
        this.addChild(this._label);
        this.addChild(new Text('Press + to increment', { dim: true }));
    }

    increment(): void {
        this._count++;
        this._label.setContent(`Count: ${this._count}`);
        this.markDirty(); // Notify TermUI that this widget needs re-rendering
    }

    handleKey(event: KeyEvent): boolean {
        if (event.key === '+') {
            this.increment();
            return true;
        }
        return false;
    }
}

async function main() {
    const counter = new Counter();
    const app = new App(counter);

    app.events.on('key', (e) => {
        if (counter.handleKey(e)) {
            app.requestRender();
        }
        // Handle exit
        if (e.key === 'q' || (e.ctrl && e.key === 'c')) {
            app.exit(0);
        }
    });

    // mount() returns a Promise resolving on exit
    await app.mount().catch(err => {
        console.error('Failed to start app:', err);
        process.exit(1);
    });
}

main();
```

---

## 2. JSX API (@termuijs/jsx)

The JSX API brings the power of React-style development to the terminal. It uses a custom TSX runtime to handle component reconciliation, state hooks, and side effects.

### When to pick it
- You are building a **complete application** with many screens and complex interactions.
- You want a **declarative UI** where the view is a function of the state.
- You are already familiar with **React Hooks** (`useState`, `useEffect`).

### Example: JSX Counter

```tsx
import { render, useState, useKeymap } from '@termuijs/jsx';
import { Box, Text } from '@termuijs/widgets';

function Counter() {
    const [count, setCount] = useState(0);

    useKeymap([
        { key: '+', action: () => setCount(c => c + 1) },
        { key: 'c', ctrl: true, action: () => process.exit(0) },
        { key: 'q', action: () => process.exit(0) },
    ]);

    return (
        <Box border="round" padding={1}>
            <Text bold>Count: {count}</Text>
            <Text dim>Press + to increment, q to quit</Text>
        </Box>
    );
}

render(<Counter />);
```

---

## 3. Quick Builder API (@termuijs/quick)

The Quick Builder API is a high-level wrapper designed for speed. It uses a fluent "chained" syntax to define layouts and binds data to widgets using simple functions.

### When to pick it
- You need to build a **dashboard or monitor** in minutes.
- You are doing **rapid prototyping** and don't want to deal with boilerplate.
- You want the framework to handle the **render loop, layout, and theming** automatically.

### Example: Quick Counter

```typescript
import { app, text } from '@termuijs/quick';

let count = 0;

app('Counter')
    .rows(
        text(() => `Count: ${count}`, { bold: true }),
        text('Press + to increment, q to quit', { dim: true })
    )
    .keys({
        '+': () => count++,
        'q': 'quit'
    })
    .run();
```

---

## Comparison at a glance

| Feature | Imperative | JSX | Quick |
|---------|------------|-----|-------|
| **Learning Curve** | Moderate | Easy (if you know React) | Very Easy |
| **Boilerplate** | High | Low | Minimal |
| **Control** | Full | High | Opinionated |
| **State Management** | Manual (`markDirty`) | Hooks (`useState`) | Reactive Functions |
| **Layout** | Manual Tree | JSX Tree | Fluent Chaining |

## Additional Notes

This document serves as a non-exhaustive guide to the capabilities and use cases of each API. Since API selection is a fundamental architectural decision, it is important to evaluate and experiment with the available options to determine which one best suits your application's requirements.
