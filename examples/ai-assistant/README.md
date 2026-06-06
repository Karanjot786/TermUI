# AI Assistant Example

An interactive AI assistant demonstrating TermUI's AI-focused widgets and streaming capabilities.

## Features

- **Dual-mode operation:**
  - **Mock Mode:** Works without any API key, streams predefined responses
  - **Real Mode:** Connects to Claude (Anthropic) when `ANTHROPIC_API_KEY` is set
- **ChatMessage** - Displays conversation history with role badges and timestamps
- **StreamingText** - Streams AI responses character-by-character
- **ToolCall** - Shows AI tool invocations with status indicators
- **ToolApproval** - Interactive tool approval flow with [y/n] prompts
- **Token Usage Display** - Shows input and output token counts
- **Interactive Input** - Type messages and press Enter to chat

## Project Structure

```text
ai-assistant/
├── package.json
├── README.md
└── src/
    └── index.tsx
```

## Installation & Usage

### Mock Mode (no API key required)

```bash
cd examples/ai-assistant
bun install
bun run dev
```

The app will run in mock mode, responding with pre-defined messages.

### Real Mode (with Anthropic API)

Set the `ANTHROPIC_API_KEY` environment variable, then run:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
cd examples/ai-assistant
bun install
bun run dev
```

The app will stream real responses from Claude.

## Controls

- **Enter** - Send message
- **Backspace** - Delete character
- **[y]** - Approve tool call (when shown)
- **[n]** - Deny tool call (when shown)
- **Ctrl+C** - Quit application

## What's Demonstrated

1. **useAI Hook** - Initializes the AI adapter (mock or real)
2. **ChatMessage Widget** - Renders conversation history with timestamps
3. **StreamingText** - Streams tokens as they arrive
4. **ToolCall & ToolApproval** - Demonstrates tool invocation and approval flow
5. **Token Tracking** - Displays token usage statistics
6. **Dual-mode Architecture** - Gracefully handles both mock and real operations

## Implementation Notes

- When `ANTHROPIC_API_KEY` is missing, the app automatically falls back to mock mode
- Tool calls are demonstrated randomly after assistant responses
- Token counts are tracked and displayed in the header
- The tool approval system shows a prompt allowing users to approve or deny tool execution

## Running the Build

```bash
bun run build
```

## Dependencies

- `@termuijs/core` - Core framework
- `@termuijs/widgets` - Widget library (ChatMessage, StreamingText, ToolCall, ToolApproval)
- `@termuijs/adapters` - useAI hook for AI provider integration
- `@termuijs/jsx` - JSX runtime and hooks
- `@termuijs/tss` - Theming system

## Learn More

- [TermUI Documentation](https://termui.io)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Other Examples](../README.md)
