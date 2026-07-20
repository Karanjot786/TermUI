# @termuijs/widgets

The building blocks for terminal UIs. Display, layout, data, charts, and feedback widgets. Every widget extends the base `Widget` class, manages its own render rectangle, and only repaints when something changes.

## Install

```bash
npm install @termuijs/widgets
```

Requires `@termuijs/core` as a peer dependency.

## All widgets

### Display

| Widget | What it does |
|--------|-------------|
| `Box` | Container with flexbox layout, borders, padding, margin |
| `Text` | Styled text. Color, bold, italic, underline, strikethrough, dim |
| `LogView` | Scrollable log panel with auto-scroll and configurable buffer |
| `StreamingText` | Typewriter effect. Respects `NO_MOTION` for instant output |
| `ChatMessage` | Chat bubble with role-aware styling (user / assistant / system) |
| `ToolCall` | AI tool call display with status indicator and collapsible args |
| `JSONView` | Collapsible, navigable JSON tree viewer |
| `DiffView` | Unified diff viewer with colored add / remove lines |
| `BigText` | Large ASCII art banner text. No external dependencies |
| `Gradient` | Text with per-character 256-color gradient |

### Layout

| Widget | What it does |
|--------|-------------|
| `Card` | Bordered container with optional title in the border |
| `ScrollView` | Height-bounded scrollable container with arrow-key navigation |
| `Center` | Centers a single child horizontally, vertically, or both |
| `Columns` | Evenly-split column layout from an array of widgets |
| `Sidebar` | Navigable sidebar with items, badges, and active highlight |
| `KeyValue` | Aligned key: value pairs with configurable separator |
| `Definition` | Term (bold) and definition (normal) stacked pairs |
| `Banner` | Full-width alert with title, body, and variant color |
| `StatusMessage` | Compact icon and message with variant color |
| `Grid` | CSS-grid-style layout; items flow left-to-right and wrap every N columns |

### Data and charts

| Widget | What it does |
|--------|-------------|
| `Table` | Data table with headers, column alignment, row selection |
| `Gauge` | Percentage indicator with label and color thresholds |
| `Sparkline` | Inline bar chart from an array of numbers |
| `BarChart` | Horizontal or vertical bar chart with grouping |
| `LineChart` | ASCII line plot with labeled X/Y axes and multi-series support |
| `HeatMap` | 2D matrix with color-scale shading and row/col labels |
| `StatusIndicator` | Colored dot with a label (ok / warn / error / unknown) |

### Feedback

| Widget | What it does |
|--------|-------------|
| `ProgressBar` | Horizontal bar with percentage fill and optional label |
| `Spinner` | Animated loading indicator. Static char when `NO_MOTION=1` |
| `Skeleton` | Animated loading placeholder (pulse or shimmer) |
| `MultiProgress` | Multiple labeled progress bars in one widget |
| `CommandPalette` | Searchable, filterable command menu |
| `Scrollbar` | Standalone scrollbar indicator (vertical or horizontal) |

### Input

| Widget | What it does |
|--------|-------------|
| `TextInput` | Single-line text input with cursor, placeholder, and change callback |
| `List` | Scrollable list with keyboard selection. Good for small datasets |
| `VirtualList` | Scroll-virtualized list. Renders only visible rows; 1M items costs the same as 10 |

## Usage

```typescript
import { Box, Text, ProgressBar, StreamingText } from '@termuijs/widgets'

const container = new Box({
    flexDirection: 'column',
    border: 'rounded',
    padding: 1,
})

container.addChild(new Text({ content: 'Downloads', bold: true }))
container.addChild(new ProgressBar({ value: 0.73, width: 30 }))
container.addChild(new StreamingText({ text: 'Processing...', speed: 40 }))
```

## VirtualList

VirtualList paints only the rows that fit in the viewport plus a small overscan buffer. A list of 1,000,000 items renders the same ~26 rows as a list of 10.

```typescript
const list = new VirtualList({
    totalItems: 1_000_000,
    renderItem: (index) => `Line ${index}: some content`,
    onSelect: (index) => inspect(index),
})

list.selectNext()
list.selectPrev()
list.pageDown()
list.selectFirst()
list.selectLast()
list.scrollTo(500)
```

## AI widgets

Display AI tool usage and streaming output with the purpose-built widgets:

```typescript
import { StreamingText, ChatMessage, ToolCall } from '@termuijs/widgets'

const msg = new ChatMessage({
    role: 'assistant',
    content: 'Here is the result...',
})

const call = new ToolCall({
    name: 'read_file',
    status: 'running',
    args: { path: '/etc/hosts' },
})

const stream = new StreamingText({
    text: 'Generating response...',
    speed: 30,
    cursor: '▋',
})
```

## caps.unicode and caps.motion

All widgets check `caps.unicode` and `caps.motion` automatically. Set `NO_UNICODE=1` or `NO_MOTION=1` in your environment to get ASCII fallbacks and static output. This works across Spinner, Skeleton, StreamingText, ProgressBar, LineChart, HeatMap, and every other widget that uses unicode characters or timers.

## Documentation

Full docs at [www.termui.io/docs/widgets/overview](https://www.termui.io/docs/widgets/overview).

## License

MIT
