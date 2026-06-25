---
layout: home

hero:
  name: "TermUI"
  text: "Build Rich CLI Apps"
  tagline: A modern terminal UI framework for building beautiful command-line applications using React-like components.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/core

features:
  - title: React-like Component API
    details: Build terminal UIs using a familiar hook-based, declarative component architecture via @termuijs/jsx.
  - title: Advanced Layout Engine
    details: Uses standard flexbox layout constraints with robust rendering specifically designed for ANSI terminals.
  - title: Global State Management
    details: Highly performant modular store system with time-travel debugging, devtools, and persistence layers.
---

## See it in Action

```tsx
import { render } from '@termuijs/core';
import { useStore } from '@termuijs/store';
import { Box, Text } from '@termuijs/jsx';

function App() {
  const count = useStore(state => state.count);
  return (
    <Box flex flexDirection="column" padding={1} border="rounded">
      <Text color="cyan">TermUI Counter</Text>
      <Text>Count: {count}</Text>
    </Box>
  );
}

render(<App />);
```
