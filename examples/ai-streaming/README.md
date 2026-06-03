# AI Streaming Example
A simple example demonstrating the AI-focused widgets available in TermUI:
* `ChatMessage`
* `ToolCall`
* `StreamingText`

## Features
* Displays a user chat message using `ChatMessage`
* Shows a tool invocation using `ToolCall`
* Streams an AI response character-by-character using `StreamingText`
* Uses a local mock response powered by `setInterval`
* No API key required
* No network requests are made

## Project Structure
```text
ai-streaming/
├── package.json
├── README.md
└── src/
    ├── index.tsx
    └── mockStream.ts
```

## Run
```bash
bun install
bun run dev
```

## How It Works
The example simulates an AI assistant response by gradually revealing text from a local string. A `setInterval` timer calls `StreamingText.tick()` to create a typewriter-style streaming effect.

This example is intended for learning and testing the AI widgets without requiring any external APIs or services.
