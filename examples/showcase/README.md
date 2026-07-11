# Showcase Example

A comprehensive demonstration of all TermUI packages in a single interactive app. Navigate through 5 tabs to explore dashboard widgets, UI components, theming, animations, and dev tools.

## Features

- **Dashboard Tab** - Real-time system metrics with gauges and sparklines
- **Components Tab** - Interactive gallery of display and input widgets
- **Theming Tab** - Live theme switching with 6 built-in themes
- **Animations Tab** - Spring physics and easing animation demos
- **DevTools Tab** - Performance metrics and hot-reload debugging

## Project Structure

```text
showcase/
├── package.json
├── README.md
├── themes/
└── src/
    ├── index.tsx
    └── tabs/
        ├── dashboard.tsx
        ├── components.tsx
        ├── theming.tsx
        ├── animations.tsx
        └── devtools.tsx
```

## Installation & Usage

```bash
cd examples/showcase
bun install
bun run dev
```

## Controls

- **1-5** - Switch between tabs
- **t** - Cycle through themes
- **Space** - Retrigger animations (Animations tab)
- **q / Ctrl+C** - Quit application

## What's Demonstrated

1. **@termuijs/core** - App lifecycle, Screen rendering, Input handling
2. **@termuijs/widgets** - Box, Text, Table, Gauge, Sparkline, and more
3. **@termuijs/ui** - Modal, Select, Tree, Divider, Toast notifications
4. **@termuijs/tss** - Theme engine with 6 built-in themes
5. **@termuijs/motion** - Spring physics and transition animations
6. **@termuijs/dev-server** - DevTools panel and performance metrics

## Dependencies

- `@termuijs/core` - Core framework
- `@termuijs/widgets` - Widget library
- `@termuijs/ui` - High-level UI components
- `@termuijs/jsx` - JSX runtime and hooks
- `@termuijs/tss` - Theming system
- `@termuijs/motion` - Animation engine
- `@termuijs/dev-server` - Hot-reload dev server

## Learn More

- [TermUI Documentation](https://termui.io)
- [Other Examples](../)
