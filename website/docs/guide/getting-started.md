# Getting Started

Welcome to **TermUI**! A modern, highly performant framework for building robust terminal applications.

## Installation

Install TermUI packages using your preferred package manager:

```bash
# Using bun
bun add @termuijs/core @termuijs/jsx @termuijs/store

# Using npm
npm install @termuijs/core @termuijs/jsx @termuijs/store
```

## Basic Example

The architecture relies on a declarative React-like API combined with a powerful flexbox layout engine.

```tsx
import { render } from '@termuijs/core';
import { Box, Text } from '@termuijs/jsx';

function App() {
  return (
    <Box padding={2} border="rounded" borderColor="blue">
      <Text color="green" bold>Hello TermUI!</Text>
    </Box>
  );
}

render(<App />);
```
