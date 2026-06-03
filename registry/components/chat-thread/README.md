# Chat Thread Component

Displays chat messages with role badges and word-wrapped content, perfect for building chat interfaces in the terminal.

## Usage

```typescript
import { ChatThread } from './components/chat-thread';

// Create a chat message
const userMessage = new ChatThread({
  role: 'user',
  content: 'Hello! How can I help?',
  timestamp: new Date()
});

const assistantMessage = new ChatThread({
  role: 'assistant',
  content: 'I can help with various tasks.',
  timestamp: new Date()
});
```

## Message Roles

- **user** — User message (cyan badge)
- **assistant** — Assistant response (green badge)
- **system** — System message (yellow badge)
- **tool** — Tool output (magenta badge)

## Features

- Role-specific colored badges
- Automatic word wrapping to container width
- Optional timestamp display
- Proper indentation for multi-line messages
- Read-only after creation (focusable: false)

## API

### Constructor

```typescript
constructor(options: ChatMessageOptions, style?: Partial<Style>)
```

### Methods

- `setContent(content: string): void` — Update the message content
- `getContent(): string` — Get the current content
- `getRole(): MessageRole` — Get the message role
- `getTimestamp(): Date | undefined` — Get the timestamp

## Example

```typescript
const conversation = new Box({ height: 30, width: 60 });

conversation.addChild(new ChatThread({
  role: 'user',
  content: 'What is the capital of France?'
}));

conversation.addChild(new ChatThread({
  role: 'assistant',
  content: 'The capital of France is Paris.'
}));
```
