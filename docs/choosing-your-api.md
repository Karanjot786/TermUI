# Choosing your API

TermUI provides three distinct ways to build terminal applications. Whether you need absolute control, a React-like developer experience, or a rapid prototyping tool, there is an API for you.

## Summary

| API | Package | Style | Best for... | Complexity |
|-----|---------|-------|-------------|------------|
| **Imperative** | `@termuijs/core` | OOP / Manual | Base widgets, custom drawing, high performance. | High |
| **JSX** | `@termuijs/jsx` | Declarative | Complex apps, interactive state, multi-screen tools. | Medium |
| **Quick Builder** | `@termuijs/quick` | Fluent / Chained | Dashboards, quick system monitors, prototypes. | Low |

---

## Decision Matrix: Which one should I use?

| If you want to... | Use this API | Why? |
|-------------------|--------------|------|
| Build a new chart or low-level input widget | **Imperative** | Direct cell-buffer access, custom event routing. |
| Build an interactive app with complex state | **JSX** | React-style hooks (`useState`, `useEffect`) manage state changes and lifecycle seamlessly. |
| Display static or polling system stats quickly | **Quick Builder** | Fluent, chained method syntax gets a dashboard running in under 30 lines of code. |
| Have maximum control over the render loop | **Imperative** | You decide exactly when to request frames and render child components. |
| Implement tab navigation and modals | **JSX** | Leverage `@termuijs/jsx` focus context and modal focus traps out of the box. |

---

## 1. Imperative API (`@termuijs/core`)

The Imperative API is the foundation of TermUI. You work directly with classes and manage the widget tree and state manually. This is the lowest-level way to use the framework.

### When to pick it
- You are building a **base widget** (like a new chart, gauge, or custom text input) that others will use.
- You need the **absolute lowest overhead** and maximum performance (zero reconciliation overhead).
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

## 2. JSX API (`@termuijs/jsx`)

The JSX API brings the power of React-style development to the terminal. It uses a custom TSX runtime to handle component reconciliation, state hooks, and side effects.

### When to pick it
- You are building a **complete application** with many screens, inputs, and complex interactions.
- You want a **declarative UI** where the view is a function of the state.
- You are already familiar with **React Hooks** (`useState`, `useEffect`, `useReducer`, `useRef`).
- You need structured **focus management** (e.g. tabs, lists, modals, forms).

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

## 3. Quick Builder API (`@termuijs/quick`)

The Quick Builder API is a high-level wrapper designed for speed. It uses a fluent "chained" syntax to define layouts and binds data to widgets using simple polling or reactive functions.

### When to pick it
- You need to build a **dashboard, status monitor, or info panel** in minutes.
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

## JSX vs. Quick Builder: A Detailed Comparison

While both JSX and Quick Builder allow declarative-like definitions, they differ fundamentally in architecture, flexibility, and control.

### 1. Architectural Model
* **JSX (`@termuijs/jsx`)**: Implements a Virtual DOM-like reconciler. When state changes, a diffing process calculates exact updates. Components have a formal lifecycle (mount, update, unmount), enabling complex side-effects using `useEffect`.
* **Quick Builder (`@termuijs/quick`)**: Bypasses the reconciler entirely. It instantiates underlying widget classes and sets up a periodic polling/refresh loop. Data binding is achieved by passing a function that evaluates dynamic values on each tick.

### 2. State & Data Flow
* **JSX**: Encourages encapsulation. Each component manages its local state (`useState`). Parent components can pass read-only props or callbacks down to children, matching standard React patterns.
* **Quick Builder**: Relies on external or global mutable state (variables in the surrounding module scope). Changes are picked up during the polling loop when functions are re-evaluated, making it ideal for simple scripts but harder to maintain in large codebases.

### 3. Layout & Flexibility
* **JSX**: Full control over styling, layout, Flexbox attributes (e.g. `flexDirection`, `alignItems`, `justifyContent`), and custom TSS (Terminal Style Sheets) classes. You can construct nested, highly customized layout trees.
* **Quick Builder**: Provides a rigid, opinionated layout structure based on rows and columns (`.rows(...)`, `.cols(...)`). Styling is applied using predefined options, which makes layout creation fast but restricts fine-grained aesthetic customization.

### 4. Input & Event Handling
* **JSX**: Highly granular focus handling. It manages focused states, cursor positions, key event bubbling, and key maps (`useKeymap`) at the component level.
* **Quick Builder**: Simple, global key map binding on the application instance (via `.keys(...)`). Best suited for simple menu selections or basic navigation actions.

---

### Side-by-Side: Polling System Monitor

To see the differences in practice, let's examine the exact same application—a real-time CPU and Memory monitor—written in both APIs.

#### Option A: Quick Builder implementation (Simple, procedural, quick)

```typescript
import { app, text, gauge } from '@termuijs/quick';
import { getCpuLoad, getMemoryUsage } from './system-metrics'; // Hypothetical helpers

app('System Monitor')
    .interval(1000) // Poll updates every 1s
    .rows(
        text('Live System Resources', { bold: true, color: 'cyan' }),
        gauge('CPU Load', () => getCpuLoad(), { color: 'green' }),
        gauge('Memory Usage', () => getMemoryUsage(), { color: 'yellow' }),
        text('Press [q] to exit', { dim: true })
    )
    .keys({
        'q': 'quit'
    })
    .run();
```

#### Option B: JSX implementation (Scalable, component-driven, rich layout)

```tsx
import { render, useState, useEffect, useKeymap } from '@termuijs/jsx';
import { Box, Text, ProgressBar } from '@termuijs/widgets';
import { getCpuLoad, getMemoryUsage } from './system-metrics';

function Dashboard() {
    const [cpu, setCpu] = useState(0);
    const [mem, setMem] = useState(0);

    // Set up a standard React-like polling effect
    useEffect(() => {
        const timer = setInterval(() => {
            setCpu(getCpuLoad());
            setMem(getMemoryUsage());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Encapsulated key actions
    useKeymap([
        { key: 'q', action: () => process.exit(0) },
        { key: 'c', ctrl: true, action: () => process.exit(0) }
    ]);

    return (
        <Box flexDirection="column" border="round" borderColor="cyan" padding={1} gap={1}>
            <Text bold color="cyan">Live System Resources</Text>
            
            <Box flexDirection="row" gap={2}>
                <Box flexDirection="column" width="50%">
                    <Text>CPU Load: {Math.round(cpu * 100)}%</Text>
                    <ProgressBar value={cpu} fillColor="green" />
                </Box>
                
                <Box flexDirection="column" width="50%">
                    <Text>Memory Usage: {Math.round(mem * 100)}%</Text>
                    <ProgressBar value={mem} fillColor="yellow" />
                </Box>
            </Box>
            
            <Text dim>Press [q] to exit</Text>
        </Box>
    );
}

render(<Dashboard />);
```

---

## Comparison at a Glance

| Feature | Imperative (`@termuijs/core`) | JSX (`@termuijs/jsx`) | Quick (`@termuijs/quick`) |
|---------|------------|-----|-------|
| **Learning Curve** | High | Moderate (Easy for React devs) | Very Easy |
| **Boilerplate** | High | Low | Minimal |
| **Control** | Full / Absolute | High | Opinionated / Low |
| **State Management** | Manual (`this.markDirty()`) | Hooks (`useState`, `useReducer`) | Reactive / External variables |
| **Layout Model** | Manual Tree Construction | Declarative JSX / Flexbox | Predefined Fluent Chains (`rows`/`cols`) |
| **Reconciler** | None | Yes (Virtual-DOM like) | None (Polling/Full Refresh) |
| **Focus Handling** | Custom / Manual | Built-in Focus Engine | Automatic |
| **Target Audience** | Widget Creators | Application Developers | Prototypers & Script Writers |

---

## Transitioning: When to upgrade from Quick to JSX?

It is common to start a project with **Quick Builder** for speed and later need to migrate to **JSX**. You should consider transitioning when:
1. **State gets complex**: You need state local to specific sections of the UI, or you need complex forms with input validation.
2. **Dynamic UI layout**: You need screens that change structure dynamically based on user interaction (e.g., navigation menus, detail panels).
3. **Advanced keymaps**: You need modal dialogs that trap key events or context-aware shortcuts.
4. **Performance tuning**: Polling the whole screen becomes expensive, and you need component-level reactive updates.
