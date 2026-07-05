# agent-chat

Interactive AI Agent Chat demo built with **TermUI** — demonstrates the `AgentChat` compound widget from `@termuijs/ui`.

## What it looks like

```
┌─ Agent Chat [mock] ────────────────── in:0 out:0 ─┐
│ [Assistant]                                        │
│   Running in mock mode. Set OPENAI_API_KEY or      │
│   ANTHROPIC_API_KEY to use a real model.           │
│ [User]                                             │
│   Tell me a joke                                   │
│ [Assistant]                                        │
│   Why did the terminal cross the road? To get to   │
│   the other shell!                                 │
├────────────────────────────────────────────────────┤
│ ❯ ▌                                                │
├────────────────────────────────────────────────────┤
│ [Enter] Send  [←/→] Move cursor  [Ctrl+C] Quit     │
└────────────────────────────────────────────────────┘
```

## Running

```bash
# From the repo root — mock mode (no API key required)
bun examples/agent-chat/src/index.tsx

# With OpenAI
OPENAI_API_KEY=sk-... bun examples/agent-chat/src/index.tsx

# With Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-... bun examples/agent-chat/src/index.tsx
```

## Controls

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `←` / `→` | Move cursor in input |
| `Backspace` | Delete character |
| `Ctrl+C` | Quit |

## Plugging in your own AI backend

The `AgentChat` widget accepts any `AgentQueryFn`:

```ts
type AgentQueryFn = (message: string) => AsyncGenerator<string>;
```

Example with Gemini:

```ts
import { AgentChat } from '@termuijs/ui';
import { App } from '@termuijs/core';

async function* geminiQuery(msg: string): AsyncGenerator<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: msg }] }] }),
    },
  );
  // parse SSE / JSON chunks and yield text tokens...
}

const chat = new AgentChat({
  title: 'Gemini Agent',
  welcomeMessage: 'Hello! I am Gemini.',
  onQuery: geminiQuery,
});

const app = new App(chat, { fullscreen: true, title: 'Gemini Chat', fps: 30 });
await app.mount();
```

## AgentChat API

```ts
import { AgentChat, AgentChatOptions } from '@termuijs/ui';

const chat = new AgentChat({
  title?: string;              // header title (default: "Agent Chat")
  placeholder?: string;        // input placeholder text
  welcomeMessage?: string;     // first assistant message shown on startup
  onQuery: AgentQueryFn;       // REQUIRED — called with each user message
});

// Public methods
chat.isResponding(): boolean;          // true while agent is generating
chat.addMessage(role, content): void;  // programmatically add a message
chat.resetTokens(): void;              // reset in/out token counters
chat.handleKey(event: KeyEvent): boolean; // forward key events
```
