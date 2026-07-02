import { App } from '@termuijs/core';
import { Widget, Box, Text, StreamingText, TextInput } from '@termuijs/widgets';
import type { Screen, KeyEvent } from '@termuijs/core';
import { ClaudeAdapter } from '@termuijs/adapters';
import { ChatThread, TokenUsage } from '@termuijs/ui';

// ──────────────────────────────────────────────────────────────────────────────
// AI Assistant Template
// ──────────────────────────────────────────────────────────────────────────────
//
// A starter template demonstrating:
//   - ChatThread widget from @termuijs/ui to show conversation history
//   - TokenUsage widget from @termuijs/ui to track input/output tokens
//   - ClaudeAdapter from @termuijs/adapters for streaming Claude API integration
//   - Dual-mode: mock (no API key) and real (with API key)

const IS_MOCK = !process.env.ANTHROPIC_API_KEY;

class AIAssistantApp extends Widget {
  private chatThread: ChatThread;
  private tokenUsage: TokenUsage;
  private streamingTextWidget: StreamingText | null = null;
  private textInput: TextInput;
  private isStreaming = false;
  private isMockMode = IS_MOCK;
  private claudeAdapter: ClaudeAdapter;
  private inputTokens = 0;
  private outputTokens = 0;

  constructor() {
    super({
      flexDirection: 'column',
      flexGrow: 1,
      padding: 1,
      gap: 1,
    });

    this.claudeAdapter = new ClaudeAdapter({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Header
    const headerBox = new Box({
      flexDirection: 'row',
      height: 1,
      gap: 1,
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      border: 'single',
      borderColor: { type: 'named' as const, name: 'brightBlack' as const },
    });

    const titleText = new Text('{{name}}', {
      bold: true,
      fg: { type: 'named' as const, name: 'cyan' as const },
    });

    const modeLabel = new Text(this.isMockMode ? '[mock mode]' : '[claude]', {
      dim: true,
    });

    headerBox.addChild(titleText);
    headerBox.addChild(modeLabel);

    // ChatThread scroll view for conversation
    this.chatThread = new ChatThread({
      style: {
        flexGrow: 1,
        border: 'single',
        borderColor: { type: 'named' as const, name: 'brightBlack' as const },
      }
    });

    // TokenUsage for stats display
    this.tokenUsage = new TokenUsage({
      inputTokens: 0,
      outputTokens: 0,
      style: {
        fg: { type: 'named' as const, name: 'yellow' as const },
        dim: true,
      }
    });

    // Input area
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
        placeholder: 'Type a message...',
        onSubmit: (val) => this.handleSendMessage(val),
      }
    );

    inputBox.addChild(inputLabel);
    inputBox.addChild(this.textInput);

    const helpText = new Text(' [Enter] Send | [Ctrl+C] Quit ', {
      dim: true,
      height: 1,
    });

    this.addChild(headerBox);
    this.addChild(this.chatThread);
    this.addChild(this.tokenUsage);
    this.addChild(inputBox);
    this.addChild(helpText);

    this.chatThread.addMessage({
      role: 'assistant',
      content: this.isMockMode
        ? 'Hi! Running in mock mode. Set ANTHROPIC_API_KEY to use real Claude.'
        : 'Hi! I am Claude. How can I help you?',
      timestamp: new Date(),
    });

    this.textInput.isFocused = true;
  }

  private removeStreamingTextWidget(): void {
    if (!this.streamingTextWidget) return;
    this.chatThread.removeThreadWidget(this.streamingTextWidget);
    this.streamingTextWidget = null;
  }

  private async handleSendMessage(userText: string): Promise<void> {
    if (!userText.trim() || this.isStreaming) return;

    this.isStreaming = true;
    this.textInput.isFocused = false;

    this.chatThread.addMessage({
      role: 'user',
      content: userText,
      timestamp: new Date()
    });

    // Estimate input tokens (simple character count / 4 fallback)
    this.inputTokens += Math.ceil(userText.length / 4);
    this.tokenUsage.setUsage(this.inputTokens, this.outputTokens);

    try {
      let fullResponse = '';

      const streamingTextWidget = new StreamingText(
        { text: '', speed: 1 },
        { border: 'single', height: 5 }
      );
      this.streamingTextWidget = streamingTextWidget;
      this.chatThread.addThreadWidget(streamingTextWidget);

      await this.claudeAdapter.streamMessage(userText, (chunk) => {
        fullResponse += chunk;
        streamingTextWidget.setText(fullResponse);
        this.outputTokens++;
        this.tokenUsage.setUsage(this.inputTokens, this.outputTokens);
        streamingTextWidget.tick();
        this.markDirty();
      });

      this.removeStreamingTextWidget();
      this.chatThread.addMessage({
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date()
      });
    } catch (e) {
      this.removeStreamingTextWidget();
      const errorMsg = e instanceof Error ? e.message : String(e);
      this.chatThread.addMessage({
        role: 'assistant',
        content: `Error: ${errorMsg}`,
        timestamp: new Date()
      });
    } finally {
      this.removeStreamingTextWidget();
      this.isStreaming = false;
      this.textInput.isFocused = true;
      this.markDirty();
    }
  }

  handleKey(event: KeyEvent): boolean {
    if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
      return false;
    }

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
    title: '{{name}}',
    fps: 30,
  });
  const exitCode = await app.mount();
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
