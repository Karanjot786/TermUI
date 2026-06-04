import { App } from '@termuijs/core';
import { Widget, Box, Text, ChatMessage, StreamingText, ScrollView, TextInput } from '@termuijs/widgets';
import type { Screen, KeyEvent } from '@termuijs/core';
import { useAI, type AIMessage } from '@termuijs/adapters';

// ──────────────────────────────────────────────────────────────────────────────
// AI Assistant Template - Minimal Version
// ──────────────────────────────────────────────────────────────────────────────
//
// A simple starter template demonstrating:
//   - ChatMessage widget for conversation display
//   - StreamingText widget for streamed responses
//   - useAI for Claude API integration
//   - Dual-mode: mock (no API key) and real (with API key)

const IS_MOCK = !process.env.ANTHROPIC_API_KEY;

const MOCK_REPLY = 'Hello! This is a mock response. Set ANTHROPIC_API_KEY to use real Claude.';

async function* mockStream(): AsyncGenerator<string> {
  for (const ch of MOCK_REPLY) {
    yield ch;
    await new Promise(r => setTimeout(r, 20));
  }
}

class AIAssistantApp extends Widget {
  private chatContainer: Box;
  private streamingTextWidget: StreamingText | null = null;
  private textInput: TextInput;
  private isStreaming = false;
  private isMockMode = IS_MOCK;
  private aiAdapter: ReturnType<typeof useAI> | null = null;

  constructor() {
    super({
      flexDirection: 'column',
      flexGrow: 1,
      padding: 1,
      gap: 1,
    });

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

    // Header
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

    const modeLabel = new Text(this.isMockMode ? '[mock mode]' : '[claude]', {
      dim: true,
    });

    headerBox.addChild(titleText);
    headerBox.addChild(modeLabel);

    // Messages scroll view
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

    const initialMessage = new ChatMessage(
      {
        role: 'assistant',
        content: this.isMockMode
          ? 'Hi! Running in mock mode. Set ANTHROPIC_API_KEY to use real Claude.'
          : 'Hi! I am Claude. How can I help you?',
        timestamp: new Date(),
      },
      { height: 3 }
    );
    this.chatContainer.addChild(initialMessage);

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
    this.addChild(messagesScroll);
    this.addChild(inputBox);
    this.addChild(helpText);

    this.textInput.isFocused = true;
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

    const userMessage = new ChatMessage(
      { role: 'user', content: userText, timestamp: new Date() },
      { height: 3 }
    );
    this.chatContainer.addChild(userMessage);

    try {
      let fullResponse = '';

      const streamingTextWidget = new StreamingText(
        { text: '', speed: 1 },
        { border: 'single', height: 5 }
      );
      this.streamingTextWidget = streamingTextWidget;
      this.chatContainer.addChild(streamingTextWidget);

      if (this.isMockMode || !this.aiAdapter) {
        const stream = mockStream();
        for await (const token of stream) {
          fullResponse += token;
          streamingTextWidget.setText(fullResponse);
          streamingTextWidget.tick();
          this.markDirty();
        }
      } else {
        const aiMessages: AIMessage[] = [{ role: 'user', content: userText }];
        for await (const token of this.aiAdapter.chat(aiMessages)) {
          fullResponse += token;
          streamingTextWidget.setText(fullResponse);
          streamingTextWidget.tick();
          this.markDirty();
        }
      }

      this.removeStreamingTextWidget();
      const assistantMessage = new ChatMessage(
        { role: 'assistant', content: fullResponse, timestamp: new Date() },
        { height: 5 }
      );
      this.chatContainer.addChild(assistantMessage);
    } catch (e) {
      this.removeStreamingTextWidget();
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorMessage = new ChatMessage(
        { role: 'assistant', content: `Error: ${errorMsg}`, timestamp: new Date() },
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

