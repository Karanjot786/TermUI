# @termuijs/quick

Build terminal apps in around 20 lines. A fluent builder API on top of the TermUI stack. Layout, data binding, theming, and the render loop are handled for you.

Good for dashboards, monitors, and prototypes where you don't need fine-grained control over every widget.

## Install

```bash
npm install @termuijs/quick
```

Requires `@termuijs/core` and `@termuijs/widgets`.

## Usage

```typescript
import { app, gauge, table, text, sparkline } from '@termuijs/quick'

app('My Dashboard')
    .rows(
        app.cols(
            gauge('CPU', () => 0.65),
            gauge('Memory', () => 0.42),
        ),
        table('Users', {
            columns: ['Name', 'Role'],
            data: () => [
                { Name: 'Alice', Role: 'Admin' },
                { Name: 'Bob', Role: 'User' },
            ],
        }),
    )
    .run()
```

## Builders

### Layout

| Builder | What it creates |
|---------|----------------|
| `app(title)` | Root container. Call `.run()` to start |
| `app.rows(...)` | Stack children vertically |
| `app.cols(...)` | Stack children horizontally |
| `grid(columns, items)` | Grid layout; items wrap every N columns |

### Display

| Builder | What it creates |
|---------|----------------|
| `text(content)` | Static or dynamic text |
| `streamingText(opts)` | Typewriter text; `text`, `speed`, `cursor` |
| `chatMessage(opts)` | Chat bubble; `role`, `content`, `timestamp` |
| `toolCall(opts)` | AI tool call display; `name`, `status`, `args`, `result` |
| `jsonView(data)` | Collapsible JSON tree |
| `diffView(diff)` | Unified diff viewer from a raw diff string |

### Data and feedback

| Builder | What it creates |
|---------|----------------|
| `gauge(label, valueFn)` | Live gauge (0.0 to 1.0) |
| `table(label, config)` | Data table from an array of objects |
| `sparkline(label, dataFn)` | Inline chart from an array of numbers |
| `multiProgress(items)` | Multiple labeled progress bars |
| `commandPalette(commands)` | Searchable command menu |

## Reactive updates

Pass a function instead of a static value. The framework calls it on each render cycle.

```typescript
gauge('CPU', () => getCpuUsage())
table('Processes', {
    columns: ['PID', 'Name', 'CPU'],
    data: () => getTopProcesses(10),
})
```

## Re-exported hooks

All major hooks are available directly from `@termuijs/quick`:

```typescript
import {
    useKeymap,
    useMotion,
    useTheme,
    useNotifications,
    useAsync,
    useCpu,
    useMemory,
    useDisk,
    useNetwork,
    useTopProcesses,
    useSystemInfo,
    useHttpHealth,
} from '@termuijs/quick'
```

## AI assistant dashboard example

```typescript
import { app, chatMessage, toolCall, streamingText } from '@termuijs/quick'

app('AI Assistant')
    .rows(
        chatMessage({ role: 'user', content: 'Show me the top processes' }),
        toolCall({ name: 'get_processes', status: 'running' }),
        streamingText({ text: 'Fetching system data...', speed: 40 }),
    )
    .run()
```

## AutoThemeProvider and ErrorBoundary

`app()` wraps your root in `AutoThemeProvider` and `ErrorBoundary` automatically. You get theme detection and error recovery without any extra setup.

## Pairs well with @termuijs/data

```typescript
import { app, gauge } from '@termuijs/quick'
import { useCpu, useMemory } from '@termuijs/quick'

function Monitor() {
    const cpu = useCpu(500)
    const mem = useMemory(1000)
    return app.cols(
        gauge('CPU', () => cpu.usage / 100),
        gauge('MEM', () => mem.used / mem.total),
    )
}
```

## Documentation

Full docs at [www.termui.io/docs/guides/quick](https://www.termui.io/docs/guides/quick).

## License

MIT
