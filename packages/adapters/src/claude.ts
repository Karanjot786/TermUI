import { createRequire } from 'node:module';

export interface ClaudeClientOptions {
    apiKey?: string;
    model?: string;
}

function isModuleNotFound(error: unknown, moduleName: string): boolean {
    return (
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND' &&
        error.message.includes(moduleName)
    );
}

function loadAnthropic() {
    try {
        const req = createRequire(import.meta.url);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = req('@anthropic-ai/sdk') as any;
        return 'default' in mod ? mod.default : mod;
    } catch (error) {
        if (isModuleNotFound(error, '@anthropic-ai/sdk')) {
            throw new Error(
                'ClaudeAdapter requires the optional peer dependency `@anthropic-ai/sdk`. Install it with: bun add @anthropic-ai/sdk'
            );
        }
        throw error;
    }
}

export class ClaudeAdapter {
    private apiKey?: string;
    private model: string;

    constructor(options: ClaudeClientOptions = {}) {
        this.apiKey = options.apiKey;
        this.model = options.model || 'claude-3-5-haiku-20241022';
    }

    async streamMessage(prompt: string, onChunk: (text: string) => void): Promise<void> {
        if (!this.apiKey) {
            // Mock streaming
            const mockReplies = [
                'Hello! Running in mock mode. Set ANTHROPIC_API_KEY for real Claude.',
                'Mock mode active — your message was received!',
                'No API key needed in mock mode. Real Claude would answer here.',
            ];
            const reply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
            for (const ch of reply) {
                onChunk(ch);
                await new Promise((r) => setTimeout(r, 20));
            }
            return;
        }

        const Anthropic = loadAnthropic();
        const client = new Anthropic({ apiKey: this.apiKey });
        const stream = await client.messages.stream({
            model: this.model,
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of stream) {
            if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
            ) {
                onChunk(event.delta.text);
            }
        }
    }
}
