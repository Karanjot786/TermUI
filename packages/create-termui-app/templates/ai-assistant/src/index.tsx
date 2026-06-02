/** @jsxImportSource @termuijs/jsx */
import { render, useState, useKeymap, useEffect, ErrorBoundary } from '@termuijs/jsx';
import { AutoThemeProvider, useTheme } from '@termuijs/tss';

// ── Types ────────────────────────────────────────────────────────────────────

interface Message { role: 'user' | 'assistant'; content: string; }
interface TokenUsageData { inputTokens: number; outputTokens: number; }

// ── Mock adapter (works without ANTHROPIC_API_KEY) ────────────────────────────

const MOCK_REPLIES = [
    'Hello! Running in mock mode. Set ANTHROPIC_API_KEY for real Claude.',
    'Mock mode active — your message was received!',
    'No API key needed in mock mode. Real Claude would answer here.',
];

async function* mockStream(_prompt: string): AsyncGenerator<string> {
    const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
    for (const ch of reply) {
        yield ch;
        await new Promise(r => setTimeout(r, 20));
    }
}

async function* claudeStream(
    messages: Message[],
    onUsage: (u: TokenUsageData) => void,
): AsyncGenerator<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1024,
            stream: true,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
    });
    if (!res.ok) throw new Error('Claude API ' + res.status + ': ' + res.statusText);
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') return;
            try {
                const ev = JSON.parse(raw);
                if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') yield ev.delta.text as string;
                if (ev.type === 'message_delta' && ev.usage) onUsage({ inputTokens: ev.usage.input_tokens ?? 0, outputTokens: ev.usage.output_tokens ?? 0 });
            } catch { /* skip */ }
        }
    }
}

// ── Components ────────────────────────────────────────────────────────────────

const IS_MOCK = !process.env.ANTHROPIC_API_KEY;

function AiAssistant() {
    const theme = useTheme();
    const [messages, setMessages] = useState<Message[]>([{
        role: 'assistant',
        content: IS_MOCK
            ? 'Hi! Running in mock mode (no ANTHROPIC_API_KEY). Type and press Enter!'
            : 'Hi! I am Claude. How can I help you?',
    }]);
    const [input, setInput]           = useState('');
    const [streaming, setStreaming]   = useState('');
    const [busy, setBusy]             = useState(false);
    const [usage, setUsage]           = useState<TokenUsageData>({ inputTokens: 0, outputTokens: 0 });

    const send = async () => {
        const text = input.trim();
        if (!text || busy) return;
        const next: Message[] = [...messages, { role: 'user', content: text }];
        setMessages(next);
        setInput('');
        setBusy(true);
        setStreaming('');
        try {
            let full = '';
            const src = IS_MOCK ? mockStream(text) : claudeStream(next, setUsage);
            for await (const chunk of src) { full += chunk; setStreaming(full); }
            setMessages(m => [...m, { role: 'assistant', content: full }]);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setMessages(m => [...m, { role: 'assistant', content: 'Error: ' + msg }]);
        } finally { setStreaming(''); setBusy(false); }
    };

    useKeymap([
        { key: 'enter',     action: () => { void send(); },                   description: 'Send' },
        { key: 'backspace', action: () => setInput(v => v.slice(0, -1)),       description: 'Delete' },
        { key: 'c', ctrl: true, action: () => process.exit(0),                description: 'Quit' },
        ...(' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?-_()').split('').map(ch => ({
            key: ch, action: () => { if (!busy) setInput(v => v + ch); }, description: '',
        })),
    ]);

    return (
        <box flexDirection="column" flexGrow={1} padding={1}>
            <box border="single" padding={1} flexDirection="row">
                <text bold>AI Assistant</text>
                <text> {IS_MOCK ? '[mock mode]' : '[claude-3-5-haiku]'}</text>
                <text color={theme.colors.muted}> in:{usage.inputTokens} out:{usage.outputTokens}</text>
            </box>

            <box flexDirection="column" flexGrow={1} padding={1}>
                {messages.map((m, i) => (
                    <box key={i} flexDirection="column" marginBottom={1}>
                        <text bold color={m.role === 'user' ? theme.colors.primary : theme.colors.success}>
                            {m.role === 'user' ? 'You' : 'Claude'}
                        </text>
                        <text>{m.content}</text>
                    </box>
                ))}
                {streaming.length > 0 && (
                    <box flexDirection="column">
                        <text bold color={theme.colors.success}>Claude</text>
                        <text>{streaming}█</text>
                    </box>
                )}
            </box>

            <box border="single" padding={1}>
                <text color={theme.colors.muted}>&gt; </text>
                <text>{input}{busy ? '' : '█'}</text>
                {busy && <text color={theme.colors.muted}> thinking...</text>}
            </box>

            <box padding={1}>
                <text dim>Ctrl+C to quit{IS_MOCK ? ' | Set ANTHROPIC_API_KEY for real Claude' : ''}</text>
            </box>
        </box>
    );
}

function App() {
    return (
        <AutoThemeProvider>
            <ErrorBoundary fallback={(err) => (
                <box border="single" borderColor="red" padding={1}>
                    <text color="red" bold>Error</text>
                    <text>{err.message}</text>
                </box>
            )}>
                <AiAssistant />
            </ErrorBoundary>
        </AutoThemeProvider>
    );
}

render(<App />, { title: 'my-ai-app' });
