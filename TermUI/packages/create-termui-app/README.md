# create-termui-app

Scaffold a new TermUI project. Pick a template, pick a theme, run `npm run dev`.

## Usage

```bash
npx create-termui-app my-app
cd my-app
npm install
npm run dev
```

The CLI walks you through a few choices, then generates a working project.

## Templates

| Template | What you get |
|----------|-------------|
| Empty | One file, no dependencies beyond core. Start fresh |
| Dashboard | Real-time gauges, tables, a status bar, and Grid layout |
| Interactive Tool | Forms, selects, and prompts. Good for CLI wizards |
| CLI Wrapper | Wraps an existing shell command in a TermUI interface |

All templates include:
- `AutoThemeProvider` at the app root for automatic theme detection
- `ErrorBoundary` wrapping for crash recovery
- `useKeymap` for all key handling instead of raw `useInput`

## Themes

Choose one of six built-in themes during setup: Default, Cyberpunk, Nord, Dracula, Catppuccin, or Solarized. Change it later in `termui.config.ts` or switch at runtime with `useTheme()`.

## Optional features

The CLI asks which extras to include:

- **Screen Router** - File-based navigation between screens
- **Data Providers** - CPU, memory, disk monitoring via `@termuijs/data` hooks
- **Hot Reload** - Auto-restart on save via `@termuijs/dev-server`
- **Testing** - Vitest config with `@termuijs/testing` ready to go

## Generated project

```
my-app/
  package.json
  tsconfig.json
  termui.config.ts
  vitest.config.ts        (if testing selected)
  themes/default.tss
  src/
    index.tsx
```

Everything is TypeScript. The dev server is preconfigured in the `dev` script.

## Modern patterns in generated code

All templates use current TermUI patterns:

```tsx
// Generated entry file example (dashboard template)
import { AutoThemeProvider, ErrorBoundary } from '@termuijs/jsx'
import { useKeymap } from '@termuijs/jsx'
import { useCpu, useMemory } from '@termuijs/data'
import { useNotifications } from '@termuijs/ui'

function App() {
    const { notify } = useNotifications()

    useKeymap({
        'ctrl+c': () => process.exit(0),
        'r':      () => notify('Refreshed', { type: 'success' }),
    })

    const cpu = useCpu(1000)
    const mem = useMemory(1000)

    return (
        <Box flexDirection="column" gap={1}>
            <Text bold>System Monitor</Text>
            <gauge label="CPU" value={cpu.usage / 100} />
            <gauge label="MEM" value={mem.used / mem.total} />
        </Box>
    )
}

render(
    <AutoThemeProvider fallback="dracula">
        <ErrorBoundary fallback={(e) => <Text color="red">{e.message}</Text>}>
            <App />
        </ErrorBoundary>
    </AutoThemeProvider>
)
```

## Documentation

Full docs at [www.termui.io/docs/getting-started/installation](https://www.termui.io/docs/getting-started/installation).

## License

MIT
