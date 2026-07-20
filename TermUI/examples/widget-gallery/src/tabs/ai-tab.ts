// ─────────────────────────────────────────────────────
// AI Tab — StreamingText, ChatMessage, ToolCall
// ─────────────────────────────────────────────────────

import { Widget, Box, Text } from '@termuijs/widgets';
import { StreamingText, ChatMessage, ToolCall } from '@termuijs/widgets';
import type { Screen } from '@termuijs/core';

// ── AITab ─────────────────────────────────────────────

export class AITab extends Widget {
    private _streamText: StreamingText;
    private _toolCall: ToolCall;
    private _statusBar: Text;
    private _streamInterval: ReturnType<typeof setInterval>;

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1 });

        // Header
        const header = new Text('AI Tab — StreamingText  |  ChatMessage  |  ToolCall', {
            bold: true,
            fg: { type: 'named', name: 'green' },
            height: 1,
        });

        // Status bar
        this._statusBar = new Text(
            '  Space to toggle ToolCall expand/collapse',
            { height: 1, fg: { type: 'named', name: 'yellow' } },
        );

        // ── StreamingText ──────────────────────────────
        const streamLabel = new Text(' StreamingText — Typewriter effect (streams at 3 chars/tick):', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        });

        this._streamText = new StreamingText(
            {
                text: 'The quick brown fox jumps over the lazy dog. This text streams in character by character to simulate an AI response being generated in real-time. The cursor blinks at the end while more content arrives.',
                speed: 3,
                cursor: '▋',
            },
            { border: 'single', height: 6, flexGrow: 0 },
        );

        // Advance streaming via setInterval
        this._streamInterval = setInterval(() => {
            this._streamText.tick();
        }, 50);

        // ── Chat messages ──────────────────────────────
        const chatLabel = new Text(' ChatMessage — Role-badged conversation:', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        });

        const chatContainer = new Box({ flexDirection: 'column', gap: 0 });

        const msg1 = new ChatMessage(
            {
                role: 'user',
                content: 'Can you help me debug this TypeScript error?',
                timestamp: new Date(),
            },
            { height: 3 },
        );

        const msg2 = new ChatMessage(
            {
                role: 'assistant',
                content: 'Of course! Please share the error message and the relevant code snippet.',
                timestamp: new Date(),
            },
            { height: 3 },
        );

        const msg3 = new ChatMessage(
            {
                role: 'tool',
                content: 'read_file("src/index.ts") → 247 lines',
            },
            { height: 2 },
        );

        chatContainer.addChild(msg1);
        chatContainer.addChild(msg2);
        chatContainer.addChild(msg3);

        // ── ToolCall ───────────────────────────────────
        const toolLabel = new Text(' ToolCall — Expandable AI tool invocation (Space to toggle):', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        });

        this._toolCall = new ToolCall(
            {
                name: 'read_file',
                args: { path: 'src/index.ts', encoding: 'utf-8' },
                result: '// 247 lines of TypeScript...',
                status: 'done',
                collapsed: true,
            },
            { border: 'single', height: 6 },
        );

        // Build widget tree
        this.addChild(header);
        this.addChild(this._statusBar);
        this.addChild(streamLabel);
        this.addChild(this._streamText);
        this.addChild(chatLabel);
        this.addChild(chatContainer);
        this.addChild(toolLabel);
        this.addChild(this._toolCall);
    }

    handleKey(key: string): void {
        if (key === 'space' || key === 'enter') {
            this._toolCall.handleKey(' ');
            const collapsed = (this._toolCall as unknown as { _collapsed: boolean })._collapsed;
            this._statusBar.setContent(
                `  ToolCall is ${collapsed ? 'COLLAPSED' : 'EXPANDED'}  •  Space to toggle`,
            );
        }
    }

    cleanup(): void {
        clearInterval(this._streamInterval);
    }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}
