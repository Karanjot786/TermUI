# @termuijs/jsx

The JSX pragma and foundational UI primitives for TermUI.

## Components

### `<Box />`
The primary container for layout. Supports flexbox, padding, margins, borders, and colors.

```tsx
<Box flexDirection="row" gap={2} padding={1}>
  <Text>Left</Text>
  <Text>Right</Text>
</Box>
```

### `<Text />`
Used for rendering text strings with ANSI styles (bold, underline, colors).

```tsx
<Text color="red" bold underline>
  Warning!
</Text>
```
