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
      }
    }

    // Header
    const headerBox = new Box({
      flexDirection: 'row',
      height: 1,
      gap: 1,
      padding: [0, 1],
      border: 'single',
      borderColor: { type: 'named' as const, name: 'brightBlack' as const },
    });

    const titleText = new Text('AI Assistant', {
      bold: true,
      fg: { type: 'named' as const, name: 'cyan' as const },
    });

    const modeLabel = new Text(IS_MOCK ? '[mock mode]' : '[claude]', {
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
        content: IS_MOCK
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
      padding: [0, 1],
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

      this.streamingTextWidget = new StreamingText(
        { text: '', speed: 1 },
        { border: 'single', height: 5 }
      );
      this.chatContainer.addChild(this.streamingTextWidget);

      if (IS_MOCK || !this.aiAdapter) {
        const stream = mockStream();
        for await (const token of stream) {
          fullResponse += token;
          this.streamingTextWidget.setText(fullResponse);
          this.streamingTextWidget.tick();
          this.markDirty();
        }
      } else {
        const aiMessages: AIMessage[] = [{ role: 'user', content: userText }];
        for await (const token of this.aiAdapter.chat(aiMessages)) {
          fullResponse += token;
          this.streamingTextWidget.setText(fullResponse);
          this.streamingTextWidget.tick();
          this.markDirty();
        }
      }

      this.chatContainer.removeChild(this.streamingTextWidget);
      const assistantMessage = new ChatMessage(
        { role: 'assistant', content: fullResponse, timestamp: new Date() },
        { height: 5 }
      );
      this.chatContainer.addChild(assistantMessage);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorMessage = new ChatMessage(
        { role: 'assistant', content: `Error: ${errorMsg}`, timestamp: new Date() },
        { height: 3 }
      );
      this.chatContainer.addChild(errorMessage);
    } finally {
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

// ── Mock adapter (works without ANTHROPIC_API_KEY) ────────────────────────────

const MOCK_REPLIES = [
  'Hello! Running in mock mode. Set ANTHROPIC_API_KEY to use real Claude.',
  'Mock mode is active. This is a pre-defined response without any API calls.',
  'No API key detected. I am running in demonstration mode with predefined responses.',
];

async function* mockStream(_messages: Message[]): AsyncGenerator<string> {
  const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
  for (const ch of reply) {
    yield ch;
    await new Promise(r => setTimeout(r, 20));
  }
}

// ── Components ────────────────────────────────────────────────────────────────

const IS_MOCK = !process.env.ANTHROPIC_API_KEY;

interface ExampleToolCall {
  name: string;
  args: Record<string, unknown>;
}

const EXAMPLE_TOOLS: ExampleToolCall[] = [
  { name: 'search_web', args: { query: 'TermUI terminal framework' } },
  { name: 'calculate', args: { expression: '42 * 2' } },
];

function AiAssistant() {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: IS_MOCK
        ? 'Hi! Running in mock mode (no ANTHROPIC_API_KEY). Type and press Enter!'
        : 'Hi! I am Claude. How can I help you?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<TokenUsageData>({
    inputTokens: 0,
    outputTokens: 0,
  });
  const [toolCall, setToolCall] = useState<ToolCallState | null>(null);
  const [toolApprovalActive, setToolApprovalActive] = useState(false);

  // Initialize AI adapter
  let ai: ReturnType<typeof useAI> | null = null;
  try {
    if (!IS_MOCK) {
      ai = useAI('anthropic', {
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });
    }
  } catch (e) {
    console.error('Failed to load AI adapter:', e);
  }

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const nextMessages: Message[] = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setBusy(true);
    setStreaming('');

    try {
      let full = '';

      const aiMessages: AIMessage[] = nextMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      if (IS_MOCK || !ai) {
        const src = mockStream(nextMessages);
        for await (const chunk of src) {
          full += chunk;
          setStreaming(full);
        }
      } else {
        for await (const token of ai.chat(aiMessages)) {
          full += token;
          setStreaming(full);
        }
        setUsage(prev => ({
          inputTokens: prev.inputTokens + Math.ceil(text.length / 4),
          outputTokens: prev.outputTokens + Math.ceil(full.length / 4),
        }));
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: full,
        timestamp: new Date(),
      };
      setMessages(m => [...m, assistantMsg]);

      // Demo: Show tool call occasionally
      if (Math.random() > 0.7) {
        const tool = EXAMPLE_TOOLS[Math.floor(Math.random() * EXAMPLE_TOOLS.length)];
        setToolCall({
          name: tool.name,
          args: tool.args,
          status: 'pending',
        });
        setToolApprovalActive(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: 'Error: ' + msg,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setStreaming('');
      setBusy(false);
    }
  };

  const handleToolApproval = (approved: boolean) => {
    if (toolCall) {
      setToolCall(prev =>
        prev
          ? {
              ...prev,
              status: 'running',
              result: approved ? `${prev.name} executed` : 'Tool call denied',
            }
          : null
      );
      setToolApprovalActive(false);

      setTimeout(() => {
        setToolCall(prev => (prev ? { ...prev, status: 'done' } : null));
      }, 500);
    }
  };

  useKeymap([
    { key: 'enter', action: () => { void send(); }, description: 'Send' },
    {
      key: 'backspace',
      action: () => setInput(v => v.slice(0, -1)),
      description: 'Delete',
    },
    { key: 'c', ctrl: true, action: () => process.exit(0), description: 'Quit' },
    {
      key: 'y',
      action: () => {
        if (toolApprovalActive) handleToolApproval(true);
      },
      description: 'Approve tool',
    },
    {
      key: 'n',
      action: () => {
        if (toolApprovalActive) handleToolApproval(false);
      },
      description: 'Deny tool',
    },
    ...(' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?-_()').split(
      ''
    ).map(ch => ({
      key: ch,
      action: () => {
        if (!busy) setInput(v => v + ch);
      },
      description: '',
    })),
  ]);

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      {/* Header */}
      <box border="single" padding={1} flexDirection="row" marginBottom={1}>
        <text bold>AI Assistant</text>
        <text color={theme.colors.muted}>
          {' '}
          {IS_MOCK ? '[mock mode]' : '[anthropic:claude-haiku]'}
        </text>
        <text color={theme.colors.muted}>
          {' '}
          in:{usage.inputTokens} out:{usage.outputTokens}
        </text>
      </box>

      {/* Messages area */}
      <box flexDirection="column" flexGrow={1} padding={1} marginBottom={1}>
        {messages.map((m, i) => (
          <box key={i} flexDirection="column" marginBottom={1}>
            <box flexDirection="row" marginBottom={1}>
              <text
                bold
                color={m.role === 'user' ? theme.colors.primary : theme.colors.success}
              >
                {m.role === 'user' ? 'You' : 'Claude'}
              </text>
              <text dim color={theme.colors.muted}>
                {' '}
                {m.timestamp.toLocaleTimeString()}
              </text>
            </box>
            <text>{m.content}</text>
          </box>
        ))}

        {/* Streaming indicator */}
        {streaming.length > 0 && (
          <box flexDirection="column" marginBottom={1}>
            <text bold color={theme.colors.success}>
              Claude
            </text>
            <text>{streaming}█</text>
          </box>
        )}

        {/* Tool call display */}
        {toolCall && (
          <box
            flexDirection="column"
            border="single"
            padding={1}
            marginTop={1}
            borderColor={theme.colors.muted}
          >
            <box flexDirection="row" marginBottom={1}>
              <text bold>Tool: </text>
              <text>{toolCall.name}</text>
            </box>
            <box flexDirection="row" marginBottom={1}>
              <text dim>Status: </text>
              <text
                color={
                  toolCall.status === 'done'
                    ? theme.colors.success
                    : toolCall.status === 'error'
                      ? theme.colors.error
                      : theme.colors.muted
                }
              >
                {toolCall.status}
              </text>
            </box>

            {/* Approval prompt */}
            {toolApprovalActive && (
              <box flexDirection="row" marginTop={1}>
                <text color={theme.colors.success} bold>
                  [y]
                </text>
                <text> Approve </text>
                <text color={theme.colors.error} bold>
                  [n]
                </text>
                <text> Deny</text>
              </box>
            )}

            {toolCall.result && (
              <box flexDirection="column" marginTop={1}>
                <text dim>Result:</text>
                <text>{String(toolCall.result)}</text>
              </box>
            )}
          </box>
        )}
      </box>

      {/* Input area */}
      <box border="single" padding={1} marginBottom={1}>
        <text color={theme.colors.muted}>&gt; </text>
        <text>{input}{busy ? '' : '█'}</text>
        {busy && <text color={theme.colors.muted}> thinking...</text>}
      </box>

      {/* Help text */}
      <box padding={0} flexDirection="column">
        <text dim>
          Ctrl+C to quit{IS_MOCK ? ' | Set ANTHROPIC_API_KEY for real Claude' : ''}
        </text>
        {toolApprovalActive && (
          <text dim>| [y] to approve tool | [n] to deny</text>
        )}
      </box>
    </box>
  );
}

function App() {
  return (
    <ErrorBoundary fallback={(err) => (
      <box border="single" borderColor="red" padding={1}>
        <text color="red" bold>Error</text>
        <text>{err.message}</text>
      </box>
    )}>
      <AutoThemeProvider>
        <AiAssistant />
      </AutoThemeProvider>
    </ErrorBoundary>
  );
}

render(<App />, { title: 'AI Assistant' });

