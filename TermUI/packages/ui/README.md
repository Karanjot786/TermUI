# @termuijs/ui

High-level interactive components built on `@termuijs/widgets`. Modals, selects, tabs, toasts, prompts, notification center, and specialized inputs.

## Install

```bash
npm install @termuijs/ui
```

Requires `@termuijs/core` and `@termuijs/widgets`.

## Components

### Composite widgets

| Component | What it does |
|-----------|-------------|
| `Select` | Dropdown with arrow key navigation and optional filtering |
| `MultiSelect` | Multiple selection with checkbox indicators |
| `Modal` | Overlay dialog. Traps focus so Tab stays inside |
| `Tabs` | Tab container with keyboard switching |
| `Form` | Groups inputs with validation and a submit handler |
| `Tree` | Collapsible tree view for hierarchical data |
| `ConfirmDialog` | Yes / No dialog |
| `CommandPalette` | Fuzzy-search command launcher |
| `Divider` | Horizontal or vertical separator line |
| `NotificationCenter` | Floating notification stack. Render once at the app root |

### Input variants

| Component | What it does |
|-----------|-------------|
| `PasswordInput` | Text input with character masking. Alt+V toggles visibility |
| `NumberInput` | Digits and decimal only. Arrow keys step by configurable amount |
| `PathInput` | Text input with Tab-completion from the file system |
| `KeyboardShortcuts` | Renders a grouped grid of key bindings |

## Usage

```typescript
import { Select, Modal, NotificationCenter, useNotifications } from '@termuijs/ui'

const select = new Select({
    label: 'Choose a color',
    options: ['Red', 'Green', 'Blue'],
    onSelect: (value) => console.log(value),
})

const modal = new Modal({
    title: 'Confirm',
    content: 'Delete this file?',
    onClose: () => {},
})
```

## Notifications

Place `NotificationCenter` at your app root once. Then call `useNotifications()` from any component.

```tsx
import { NotificationCenter, useNotifications } from '@termuijs/ui'

function App() {
    return (
        <Box>
            <NotificationCenter position="top-right" />
            <Dashboard />
        </Box>
    )
}

function Dashboard() {
    const { notify, dismiss } = useNotifications()

    useKeymap({
        's': async () => {
            await save()
            notify('Saved', { type: 'success', duration: 2000 })
        },
    })
    return <Box>...</Box>
}
```

`notify()` returns an ID. Pass it to `dismiss(id)` to remove the notification early. Pass `duration: 0` for a persistent notification.

## Imperative prompts

Ask for user input without restructuring your component tree. All four functions return Promises.

```typescript
import { prompt } from '@termuijs/ui'

// Text input
const name = await prompt.text('Enter your name:')

// Confirmation
const ok = await prompt.confirm('Delete all logs?')
if (ok) deleteLogs()

// Single selection
const env = await prompt.select('Choose environment:', ['dev', 'staging', 'prod'])

// Multiple selection
const features = await prompt.multiSelect('Enable features:', ['auth', 'cache', 'logging'])
```

Prompts block key input to the rest of the UI while open. A focus trap is applied automatically.

## Specialized inputs

```typescript
import { PasswordInput, NumberInput, PathInput, KeyboardShortcuts } from '@termuijs/ui'

const pwd = new PasswordInput({ placeholder: 'Password', onChange: (v) => setVal(v) })
// Alt+V toggles character masking

const num = new NumberInput({
    value: 10,
    min: 0,
    max: 100,
    step: 5,
    onChange: (v) => setCount(v),
})
// Arrow keys step up/down. Rejects non-numeric input.

const path = new PathInput({ cwd: process.cwd(), showHidden: false })
// Tab key completes from fs.readdirSync

const shortcuts = new KeyboardShortcuts({
    bindings: [
        { key: 'ctrl+c', description: 'Quit',   category: 'General' },
        { key: '/',      description: 'Search', category: 'Navigation' },
        { key: 'Enter',  description: 'Select', category: 'Navigation' },
    ],
    columns: 2,
})
```

## Documentation

Full docs at [www.termui.io/docs/ui/overview](https://www.termui.io/docs/ui/overview).

## License

MIT
