# Markdown Component

Renders markdown content in the terminal using a lightweight text-based renderer.

## Usage

```typescript
import { Markdown } from './index';

// Create a markdown renderer
const markdown = new Markdown({
  content: `# Welcome

This is markdown content rendered in the terminal.
`
});
```

## Supported Content

The current implementation supports:

* Headings
* Paragraph text
* Line breaks
* **Bold** - `**text**`
* *Italic* - `_text_`
* Inline code - `` `code` ``
* Unordered lists - `- item`
* Ordered lists - `1. item`
* Code fences - fenced code blocks

## Features

* Word wrapping to container width
* Terminal-safe text rendering
* Lightweight markdown display

## API

### Constructor

```typescript
constructor(opts: MarkdownOptions, style?: Partial<Style>)
```

### Methods

* `setContent(content: string): void` - Update the markdown content
* `getContent(): string` - Get the current markdown content

## Example

```typescript
const container = new Box({
  height: 20,
  width: 60
});

const markdown = new Markdown({
  content: `# Welcome

This content is rendered inside the terminal.
`
});

container.addChild(markdown);
```
