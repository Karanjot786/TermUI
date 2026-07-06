// ──────────────────────────────────────────────────────────────────────────────
// Agent Chat Demo
// ──────────────────────────────────────────────────────────────────────────────
//
// Demonstrates the AgentChat compound widget from @termuijs/ui.
//
// Dual-mode operation:
//   Mock mode  — works without any API key; yields canned replies char-by-char.
//   OpenAI     — set OPENAI_API_KEY; uses gpt-4o-mini via fetch streaming.
//   Anthropic  — set ANTHROPIC_API_KEY; uses claude-haiku-3 via fetch streaming.
//
// Run:
//   bun examples/agent-chat/src/index.tsx
//
// ──────────────────────────────────────────────────────────────────────────────

import { App } from '@termuijs/core';
import { AgentChat, type AgentQueryFn } from '@termuijs/ui';

// ── Mock responses ─────────────────────────────────────────────────────────

const MOCK_RESPONSES = [
    'Running in mock mode — no API key detected. Set OPENAI_API_KEY or ANTHROPIC_API_KEY to use a real model.',
    'This is a pre-canned reply from the mock backend. Try asking me anything — I always have a creative answer ready!',
    "Mock mode active! I'm demonstrating the AgentChat widget's streaming capability. Each character is yielded with a small delay to simulate a real LLM response.",
    "The AgentChat widget supports any async generator as a backend. Swap out this mock function for an OpenAI, Anthropic, or Gemini call and you're done!",
    'TermUI makes terminal UIs as easy to build as web UIs. This entire chat pane is a single reusable component — AgentChat from @termuijs/ui.',
];

let _mockIndex = 0;

/** Streams a canned reply character-by-character with a realistic delay. */
async function* mockQuery(_msg: string): AsyncGenerator<string> {
    const reply = MOCK_RESPONSES[_mockIndex % MOCK_RESPONSES.length];
    _mockIndex++;

    // Simulate a short "thinking" pause
    await new Promise<void>((r) => setTimeout(r, 300));

    for (const ch of reply) {
        yield ch;
        await new Promise<void>((r) => setTimeout(r, 18));
    }
}

// ── OpenAI streaming (gpt-4o-mini) ────────────────────────────────────────

async function* openAIQuery(msg: string): AsyncGenerator<string> {
    const apiKey = process.env.OPENAI_API_KEY!;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            stream: true,
            messages: [{ role: 'user', content: msg }],
        }),
    });

    if (!res.ok || !res.body) {
        throw new Error(`OpenAI error: ${res.status} ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    // Buffer incomplete lines: SSE `data: ...` lines can be split across chunks.
    let remainder = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = remainder + decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        // The last element is either empty (complete line) or a partial line.
        remainder = lines.pop() ?? '';

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice('data: '.length).trim();
            if (data === '[DONE]') return;
            try {
                const json = JSON.parse(data) as {
                    choices: { delta?: { content?: string } }[];
                };
                const content = json.choices[0]?.delta?.content;
                if (content) yield content;
            } catch {
                // skip malformed chunks
            }
        }
    }
}

// ── Anthropic streaming (claude-haiku-3) ──────────────────────────────────

async function* anthropicQuery(msg: string): AsyncGenerator<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY!;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            // claude-haiku-4-5-20251001 is the current Haiku model alias.
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            stream: true,
            messages: [{ role: 'user', content: msg }],
        }),
    });

    if (!res.ok || !res.body) {
        throw new Error(`Anthropic error: ${res.status} ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    // Buffer incomplete lines: SSE `data: ...` lines can be split across chunks.
    let remainder = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = remainder + decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        // The last element is either empty (complete line) or a partial line.
        remainder = lines.pop() ?? '';

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice('data: '.length).trim();
            try {
                const json = JSON.parse(data) as {
                    type: string;
                    delta?: { type: string; text?: string };
                };
                if (json.type === 'content_block_delta' && json.delta?.text) {
                    yield json.delta.text;
                }
            } catch {
                // skip malformed chunks
            }
        }
    }
}

// ── Backend selection ──────────────────────────────────────────────────────

function selectBackend(): { fn: AgentQueryFn; label: string; welcome: string } {
    if (process.env.OPENAI_API_KEY) {
        return {
            fn: openAIQuery,
            label: 'gpt-4o-mini',
            welcome:
                'Connected to OpenAI (gpt-4o-mini). Type a message and press Enter to chat!',
        };
    }

    if (process.env.ANTHROPIC_API_KEY) {
        return {
            fn: anthropicQuery,
            label: 'claude-haiku',
            welcome:
                'Connected to Anthropic Claude Haiku. Type a message and press Enter to chat!',
        };
    }

    return {
        fn: mockQuery,
        label: 'mock',
        welcome:
            'Running in mock mode (no API key). ' +
            'Set OPENAI_API_KEY or ANTHROPIC_API_KEY to use a real model. ' +
            'Type anything and press Enter!',
    };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const { fn, label, welcome } = selectBackend();

    const chat = new AgentChat({
        title: `Agent Chat [${label}]`,
        placeholder: 'Ask me anything…',
        welcomeMessage: welcome,
        onQuery: fn,
    });

    const app = new App(chat, {
        fullscreen: true,
        title: 'Agent Chat — TermUI Demo',
        fps: 30,
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
