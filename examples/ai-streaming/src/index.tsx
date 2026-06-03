import { App } from '@termuijs/core';
import { Widget, Box, Text, ChatMessage, ToolCall, StreamingText } from '@termuijs/widgets';
import type { Screen, KeyEvent } from '@termuijs/core';
import { mockResponse } from './mockStream.js';

class AIStreamingApp extends Widget {
    private _streamingText: StreamingText;
    private _toolCall: ToolCall;

    constructor() {
        super({
            flexDirection: 'column',
            flexGrow: 1,});

        const title = new Text('🤖 AI Streaming Example', {
            bold: true,
            height: 1,
        });

       const userMessage = new ChatMessage({
       role: 'user',
       content: 'Explain what a binary tree is.',},
       { height: 3 });
       this._toolCall = new ToolCall({
        name: 'search_docs',
        args: { topic: 'binary tree' },
        result: 'Found documentation',
        status: 'done',
        collapsed: false,},
        { border: 'single', height: 6 });
        
        this._streamingText = new StreamingText({
        text: mockResponse,
        speed: 1,},
        { border: 'single', height: 6 });

        this.addChild(title);
        this.addChild(userMessage);
        this.addChild(this._toolCall);
        this.addChild(this._streamingText);

        setInterval(() => {
            this._streamingText.tick();
        }, 50);
    }

    handleKey(_event: KeyEvent): boolean {
        return true;
    }

    protected _renderSelf(_screen: Screen): void {}
}

async function main() {
    const root = new AIStreamingApp();

    const app = new App(root, {
        fullscreen: true,
        title: 'AI Streaming Example',
        fps: 30,
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});