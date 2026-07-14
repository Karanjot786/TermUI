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
| `Button` | Pressable button with variants, disabled/loading states, and keyboard activation |
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
const progress = new ProgressBar({ value: 0.73, width: 30 })
container.addChild(progress)
container.addChild(new StreamingText({ text: 'Processing...', speed: 40 }))

// Later, reuse the same ProgressBar instance
progress.setValue(0.8)
progress.clear()

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
## Button

A pressable button with a label, four visual variants, and built-in disabled/loading states. Handles `enter` and `space` key activation when focused, provided your app forwards keyboard events to it via `handleKey()`.

### Purpose

`Button` renders a bordered, centered-label button that responds to keyboard activation. It's the standard way to trigger an action (submit, confirm, cancel, retry) in a TermUI app. It manages its own focus-aware border color, supports a busy/loading spinner state, and falls back to ASCII box-drawing characters when `NO_UNICODE=1`.

### Props

**Constructor:** `new Button(label: string, style?: Partial<Style>, opts?: ButtonOptions)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `variant` | `'default' \| 'primary' \| 'danger' \| 'ghost'` | `'default'` | Controls background/foreground color scheme |
| `disabled` | `boolean` | `false` | When `true`, ignores `enter`/`space` key activation |
| `onPress` | `() => void` | `undefined` | Called when the button is activated via keyboard |
| `color` | `Color` | variant default | Overrides the variant's background color |
| `loading` | `boolean` | `false` | Shows an animated spinner and suppresses activation while `true` |
| `loadingText` | `string` | falls back to `label` | Text shown next to the spinner while `loading` is `true` |

### Methods

- `setLabel(label: string): void` — update the displayed label (no-op + no re-render if unchanged)
- `setDisabled(disabled: boolean): void` — toggle disabled state (no-op + no re-render if unchanged)
- `setLoading(loading: boolean): void` — toggle loading state; starts/stops the spinner timer
- `setLoadingText(loadingText: string | undefined): void` — update the text shown while loading
- `handleKey(event: KeyEvent): void` — call this from your app's key handler to route `enter`/`space` to the button

### Examples

**1. Basic button with a click handler**
```typescript
import { Button } from '@termuijs/widgets'

const button = new Button('Click Me!', {}, {
    onPress: () => console.log('Button pressed!'),
})
```

**2. Variants**
```typescript
const submitBtn = new Button('Submit', {}, { variant: 'primary', onPress: submit })
const deleteBtn = new Button('Delete', {}, { variant: 'danger', onPress: remove })
const cancelBtn = new Button('Cancel', {}, { variant: 'ghost', onPress: cancel })
```

**3. Disabled button**
```typescript
const saveBtn = new Button('Save', {}, {
    disabled: !formIsValid,
    onPress: save,
})

// Toggle later, e.g. once validation passes
saveBtn.setDisabled(false)
```

**4. Loading state during an async action**
```typescript
const submitBtn = new Button('Submit', {}, {
    variant: 'primary',
    onPress: async () => {
        submitBtn.setLoading(true)
        submitBtn.setLoadingText('Submitting...')
        try {
            await submitForm()
        } finally {
            submitBtn.setLoading(false)
        }
    },
})
```

### Common patterns

- **Routing keys to the button:** `Button` doesn't listen for input on its own — forward key events from your app's key handler:
```typescript
  app.events.on('key', (event) => {
      if (button.isFocused) button.handleKey(event)
  })
```
- **Focus indication:** the button's border automatically turns cyan when `isFocused` is `true`. Set `button.isFocused = true` when it should be the active element.
- **Disable during async work:** prefer `loading` over `disabled` for actions that take time — it gives the user visual feedback (spinner) instead of a button that silently does nothing.
- **Only `'enter'` and `'space'` (lowercase) trigger `onPress`.** Uppercase `'Enter'` or a raw `' '` character will not activate the button — this matches how `KeyEvent.key` is normalized elsewhere in TermUI.

### Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Button doesn't respond to Enter/Space | Key events aren't being forwarded to `button.handleKey()` | Call `button.handleKey(event)` from your app's `'key'` event handler |
| Button looks unfocused even though it's the active element | `isFocused` was never set | Set `button.isFocused = true` manually — `Button` doesn't manage focus state itself |
| `onPress` fires even while `loading` is `true` | You're calling `onPress` directly instead of routing through `handleKey` | Only `handleKey` respects the `loading`/`disabled` guard; don't call `onPress` directly |
| Label or disabled state doesn't visually update | You're mutating internal state directly | Always use `setLabel()` / `setDisabled()` / `setLoading()` — these call `markDirty()` for you |
| Spinner doesn't animate | `NO_MOTION=1` is set, or `prefersReducedMotion()` returns true | This is expected behavior — motion is intentionally disabled; the spinner shows a static first frame instead |
| Box-drawing characters render as `?` or garbled | Terminal doesn't support Unicode | Set `NO_UNICODE=1` to force the ASCII fallback (`+`, `-`, `\|`) |

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
