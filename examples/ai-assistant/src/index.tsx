import { App } from '@termuijs/core';
import { Widget, Box, Text, ChatMessage, ToolCall, ToolApproval, StreamingText, ScrollView, TextInput } from '@termuijs/widgets';
import type { Screen, KeyEvent } from '@termuijs/core';
import { useAI, type AIMessage } from '@termuijs/adapters';

// ──────────────────────────────────────────────────────────────────────────────
// AI Assistant Example
// ──────────────────────────────────────────────────────────────────────────────
//
// Demonstrates TermUI's AI-focused widgets:
//   - ChatMessage: displays conversation history
//   - StreamingText: streams AI responses token-by-token
//   - ToolCall & ToolApproval: shows tool invocations with approval workflow
//   - useAI: hooks into Anthropic Claude API
//
// Dual-mode operation:
//   - Mock Mode: works without ANTHROPIC_API_KEY, uses predefined responses
//   - Real Mode: uses Claude API when ANTHROPIC_API_KEY is set
//
// Note: ChatMessage widgets are used for conversation history instead of
// a ChatThread widget (which does not exist in the repository). Simple
// token counting is displayed in the header instead of a TokenUsage widget
// (which also does not exist).

const IS_MOCK = !process.env.ANTHROPIC_API_KEY;

const MOCK_REPLIES = [
  'Hello! Running in mock mode. Set ANTHROPIC_API_KEY to use real Claude.',
  'Mock mode is active. This is a pre-defined response without any API calls.',
  'No API key detected. I am running in demonstration mode with predefined responses.',
];

const EXAMPLE_TOOLS = [
  { name: 'search_web', args: { query: 'TermUI terminal framework' } },
  { name: 'calculate', args: { expression: '42 * 2' } },
];

async function* mockStream(): AsyncGenerator<string> {
  const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
  for (const ch of reply) {
    yield ch;
    await new Promise(r => setTimeout(r, 20));
  }
}

class AIAssistantApp extends Widget {
  private chatContainer: Box;
  private streamingTextWidget: StreamingText | null = null;
  private toolApprovalWidget: ToolApproval | null = null;
  private textInput: TextInput;
  private modeLabel: Text;
  private tokenLabel: Text;
  private isStreaming = false;
  private isMockMode = IS_MOCK;
  private inputTokens = 0;
  private outputTokens = 0;
  private aiAdapter: ReturnType<typeof useAI> | null = null;

  constructor() {
    super({
      flexDirection: 'column',
      flexGrow: 1,
      padding: 1,
      gap: 1,
    });

    // Initialize AI adapter if API key exists
    if (!IS_MOCK) {
      try {
        this.aiAdapter = useAI('anthropic', {
          apiKey: process.env.ANTHROPIC_API_KEY!,
        });
      } catch (e) {
        console.error('Failed to initialize AI adapter:', e);
        this.isMockMode = true;
        this.aiAdapter = null;
      }
    }

    // ── Header ───────────────────────────────────────────────────────────────

    const headerBox = new Box({
      flexDirection: 'row',
      height: 1,
      gap: 1,
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      border: 'single',
      borderColor: { type: 'named' as const, name: 'brightBlack' as const },
    });

    const titleText = new Text('AI Assistant', {
      bold: true,
      fg: { type: 'named' as const, name: 'cyan' as const },
    });

    this.modeLabel = new Text(this.isMockMode ? '[mock mode]' : '[claude-haiku]', {
      dim: true,
    });

    this.tokenLabel = new Text('in:0 out:0', {
      dim: true,
      fg: { type: 'named' as const, name: 'yellow' as const },
    });

    headerBox.addChild(titleText);
    headerBox.addChild(this.modeLabel);
    headerBox.addChild(this.tokenLabel);

    // ── Messages scroll view ──────────────────────────────────────────────────

    const messagesScroll = new ScrollView(
      {
        flexGrow: 1,
        border: 'single',
        borderColor: { type: 'named' as const, name: 'brightBlack' as const },
      },
      { showScrollbar: true }
    );

    this.chatContainer = new Box({
      flexDirection: 'column',
      gap: 1,
    });

    messagesScroll.addChild(this.chatContainer);

    // Add initial assistant message
    const initialMessage = new ChatMessage(
      {
        role: 'assistant',
        content: this.isMockMode
          ? 'Hi! Running in mock mode (no ANTHROPIC_API_KEY). Type and press Enter!'
          : 'Hi! I am Claude. How can I help you?',
        timestamp: new Date(),
      },
      { height: 3 }
    );
    this.chatContainer.addChild(initialMessage);

    // ── Input area ────────────────────────────────────────────────────────────

    const inputBox = new Box({
      flexDirection: 'row',
      height: 3,
      gap: 1,
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      border: 'single',
      borderColor: { type: 'named' as const, name: 'brightBlack' as const },
    });

    const inputLabel = new Text('> ', {
      fg: { type: 'named' as const, name: 'green' as const },
      bold: true,
    });

    this.textInput = new TextInput(
      { flexGrow: 1 },
      {
        placeholder: 'Type message and press Enter...',
        onSubmit: (val) => this.handleSendMessage(val),
      }
    );

    inputBox.addChild(inputLabel);
    inputBox.addChild(this.textInput);

    // ── Help bar ──────────────────────────────────────────────────────────────

    const helpText = new Text(
      ' [Enter] Send | [y/n] Approve tool | [Ctrl+C] Quit ',
      {
        dim: true,
        height: 1,
      }
    );

    // ── Build widget tree ─────────────────────────────────────────────────────

    this.addChild(headerBox);
    this.addChild(messagesScroll);
    this.addChild(inputBox);
    this.addChild(helpText);

    this.textInput.isFocused = true;
  }

  private updateTokenLabel(): void {
    this.tokenLabel.setContent(`in:${this.inputTokens} out:${this.outputTokens}`);
  }

  private removeStreamingTextWidget(): void {
    if (!this.streamingTextWidget) return;
    this.chatContainer.removeChild(this.streamingTextWidget);
    this.streamingTextWidget = null;
  }

  private async handleSendMessage(userText: string): Promise<void> {
    if (!userText.trim() || this.isStreaming) return;

    this.isStreaming = true;
    this.textInput.isFocused = false;

    // Add user message
    const userMessage = new ChatMessage(
      {
        role: 'user',
        content: userText,
        timestamp: new Date(),
      },
      { height: 3 }
    );
    this.chatContainer.addChild(userMessage);

    try {
      // Collect all messages for API call
      const allMessages: AIMessage[] = [
        { role: 'assistant', content: 'Hi! I am Claude. How can I help you?' },
      ];

      // Stream response
      let fullResponse = '';
      this.inputTokens += Math.ceil(userText.length / 4);
      this.updateTokenLabel();

      // Create streaming text widget
      const streamingTextWidget = new StreamingText(
        {
          text: '',
          speed: 1,
        },
        { border: 'single', height: 5 }
      );
      this.streamingTextWidget = streamingTextWidget;
      this.chatContainer.addChild(streamingTextWidget);

      if (this.isMockMode || !this.aiAdapter) {
        const stream = mockStream();
        for await (const token of stream) {
          fullResponse += token;
          streamingTextWidget.setText(fullResponse);
          this.outputTokens++;
          this.updateTokenLabel();
          streamingTextWidget.tick();
          this.markDirty();
        }
      } else {
        const aiMessages: AIMessage[] = [
          ...allMessages,
          { role: 'user', content: userText },
        ];

        for await (const token of this.aiAdapter.chat(aiMessages)) {
          fullResponse += token;
          streamingTextWidget.setText(fullResponse);
          this.outputTokens++;
          this.updateTokenLabel();
          streamingTextWidget.tick();
          this.markDirty();
        }
      }

      // Replace streaming widget with final ChatMessage
      this.removeStreamingTextWidget();
      const assistantMessage = new ChatMessage(
        {
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date(),
        },
        { height: 5 }
      );
      this.chatContainer.addChild(assistantMessage);

      // Occasionally demonstrate tool approval workflow
      if (Math.random() > 0.6) {
        await this.demonstrateToolApproval();
      }
    } catch (e) {
      this.removeStreamingTextWidget();
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorMessage = new ChatMessage(
        {
          role: 'assistant',
          content: `Error: ${errorMsg}`,
          timestamp: new Date(),
        },
        { height: 3 }
      );
      this.chatContainer.addChild(errorMessage);
    } finally {
      this.removeStreamingTextWidget();
      this.isStreaming = false;
      this.textInput.isFocused = true;
      this.markDirty();
    }
  }

  private async demonstrateToolApproval(): Promise<void> {
    const toolCallWidget = new ToolCall(
      {
        name: 'search_web',
        args: { query: 'TermUI framework' },
        status: 'running',
        collapsed: false,
      },
      { border: 'single', height: 6 }
    );

    this.chatContainer.addChild(toolCallWidget);
    this.markDirty();

    await new Promise((resolve) => setTimeout(resolve, 500));
    toolCallWidget.setStatus('done');
    toolCallWidget.setResult('Search completed successfully');
    this.markDirty();

    const tool = EXAMPLE_TOOLS[Math.floor(Math.random() * EXAMPLE_TOOLS.length)];
    let toolDone = false;

    const toolWidget = new ToolApproval(
      {
        name: tool.name,
        args: tool.args,
        status: 'pending',
        collapsed: false,
        onApprove: () => {
          toolWidget.setStatus('running');
          setTimeout(() => {
            toolWidget.setStatus('done');
            toolWidget.setResult(`${tool.name} executed successfully`);
            toolDone = true;
          }, 500);
        },
        onDeny: () => {
          toolWidget.setStatus('error');
          toolWidget.setResult('Tool execution denied');
          toolDone = true;
        },
      },
      { border: 'single', height: 6 }
    );

    this.toolApprovalWidget = toolWidget;
    this.chatContainer.addChild(toolWidget);
    this.markDirty();

    // Wait for approval/denial
    while (!toolDone) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  handleKey(event: KeyEvent): boolean {
    if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
      return false;
    }

    if (event.key === 'y' && this.toolApprovalWidget) {
      this.toolApprovalWidget.handleKey('y');
      return true;
    }

    if (event.key === 'n' && this.toolApprovalWidget) {
      this.toolApprovalWidget.handleKey('n');
      return true;
    }

    // Route other keys to TextInput
    if (event.key === 'enter' || event.key === 'return') {
      this.textInput.submit();
      return true;
    }

    if (event.key === 'backspace') {
      this.textInput.deleteBack();
      return true;
    }

    if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
      this.textInput.insertChar(event.key);
      return true;
    }

    return true;
  }

  protected _renderSelf(_screen: Screen): void {}
}

async function main() {
  const root = new AIAssistantApp();

  const app = new App(root, {
    fullscreen: true,
    title: 'AI Assistant',
    fps: 30,
  });

  const exitCode = await app.mount();
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
