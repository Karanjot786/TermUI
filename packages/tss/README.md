# @termuijs/tss

Terminal Style Sheets. A CSS-like styling system for terminal apps with variables, selectors, theme tokens, and an automatic theme provider.

## Install

```bash
npm install @termuijs/tss
```

Requires `@termuijs/core` and `@termuijs/widgets`.

## Built-in themes

Nine themes ship ready to use: Default, Cyberpunk, Nord, Dracula, Gruvbox, Catppuccin, Solarized, Tokyo Night, and High Contrast.

```typescript
import { getBuiltinThemeNames, getBuiltinTheme, TSSEngine } from '@termuijs/tss'

getBuiltinThemeNames()
// ['default', 'cyberpunk', 'nord', 'dracula', 'gruvbox', 'catppuccin', 'solarized', 'tokyo-night', 'highContrast']

const engine = new TSSEngine()
engine.load(getBuiltinTheme('nord'))
```

## TSS syntax

TSS files look like CSS but target terminal widgets:

```
@theme cyberpunk {
    $primary: #ff00ff;
    $secondary: #00ffff;
    $bg: #0a0a0a;

    Box {
        border-color: $primary;
        background: $bg;
    }

    Text.title {
        color: $secondary;
        bold: true;
    }

    ProgressBar {
        fill-color: $primary;
        empty-color: #333333;
    }
}
```

## useTheme

Switch themes at runtime from any component:

```typescript
import { useTheme } from '@termuijs/tss'

function ThemeSwitcher() {
    const { theme, setTheme, availableThemes } = useTheme()

    useKeymap({
        't': () => {
            const idx = availableThemes.indexOf(theme)
            setTheme(availableThemes[(idx + 1) % availableThemes.length])
        },
    })

    return <Text>Theme: {theme}</Text>
}
```

## AutoThemeProvider

Detects the terminal background color via an OSC query and picks the closest theme automatically.

```tsx
import { AutoThemeProvider } from '@termuijs/tss'

function App() {
    return (
        <AutoThemeProvider fallback="dracula">
            <Dashboard />
        </AutoThemeProvider>
    )
}
```

Set `NO_COLOR=1` to disable all ANSI color output. `AutoThemeProvider` checks `caps.color` before registering any terminal queries.

## Theme tokens

Named token objects are available for programmatic access without the TSS engine:

```typescript
import { draculaTheme, nordTheme, catppuccinTheme } from '@termuijs/tss'

// Direct property access
const primaryColor = nordTheme['--primary']
const bgColor = draculaTheme['--bg']
```

Available token exports: `draculaTheme`, `nordTheme`, `gruvboxTheme`, `catppuccinTheme`, `monokaiTheme`, `solarizedTheme`, `tokyoNightTheme`, `oneDarkTheme`, `highContrastTheme`.

## tokensToTSS

Convert a token object to a TSS `@theme` block string. Use this to load token-based themes into the engine.

```typescript
import { tokensToTSS, nordTheme, TSSEngine } from '@termuijs/tss'

const tss = tokensToTSS('nord', nordTheme)
const engine = new TSSEngine()
engine.load(tss)
```

## How it works

Three stages:

1. Tokenizer breaks the `.tss` source into tokens.
2. Parser builds an AST from the token stream.
3. Engine resolves selectors against widget types and class names, substituting variables along the way.

The engine caches resolved styles, so repeated lookups for the same selector are fast.

## Documentation

Full docs at [www.termui.io/docs/tss/overview](https://www.termui.io/docs/tss/overview).

## License

MIT
