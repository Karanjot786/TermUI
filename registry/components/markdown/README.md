# Markdown Component

Renders a subset of Markdown syntax in the terminal with support for formatting and layout.

## Usage

```typescript
import { Markdown } from './components/markdown';

// Create a markdown renderer
const markdown = new Markdown({
  content: `# Heading
This is **bold** and _italic_ text.

- List item 1
- List item 2

\`\`\`typescript
const code = "example";
\`\`\``
});
```

## Supported Syntax

- **Headings** — `# Heading 1`, `## Heading 2`, etc.
- **Bold** — `**text**`
- **Italic** — `_text_`
- **Inline code** — `` `code` ``
- **Unordered lists** — `- item`
- **Ordered lists** — `1. item`
- **Code blocks** — `` ```lang ... ``` ``

## Features

- Word wrapping to container width
- Syntax highlighting for code blocks
- Proper indentation for list items
- Terminal-safe formatting

## API

### Constructor

```typescript
constructor(opts: MarkdownOptions, style?: Partial<Style>)
```

### Methods

- `setContent(content: string): void` — Update the markdown content
- `getContent(): string` — Get the current content

## Example

```typescript
const container = new Box({ height: 20, width: 60 });
const md = new Markdown({
  content: `## Welcome
This is a **terminal markdown** renderer.`
});
container.addChild(md);
```
