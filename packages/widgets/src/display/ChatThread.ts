import { type Screen, type Style, type KeyEvent } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { ChatMessage } from './ChatMessage.js';

export interface ThreadMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export class ChatThread extends Widget {
    private _messages: ThreadMessage[] = [];
    private _scrollOffset = 0;

    constructor(
        style: Partial<Style> = {},
        messages: ThreadMessage[] = [],
    ) {
        super(style);
        this._messages = messages.slice();
        this.focusable = true;
    }

    addMessage(message: ThreadMessage): void {
        this._messages.push(message);
        this._scrollToBottom();
        this.markDirty();
    }

    private _scrollToBottom(): void {
        const rect = this._getContentRect();
        const visibleRows = Math.max(1, rect.height);

        this._scrollOffset = Math.max(
            0,
            this._messages.length - visibleRows,
        );
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'up':
                this._scrollOffset = Math.max(
                    0,
                    this._scrollOffset - 1,
                );
                this.markDirty();
                break;

            case 'down': {
                const rect = this._getContentRect();
                const visibleRows = Math.max(1, rect.height);

                const maxOffset = Math.max(
                    0,
                    this._messages.length - visibleRows,
                );

                this._scrollOffset = Math.min(
                    maxOffset,
                    this._scrollOffset + 1,
                );

                this.markDirty();
                break;
            }
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;

        if (width <= 0 || height <= 0) {
            return;
        }

        const visibleMessages = this._messages.slice(
            this._scrollOffset,
            this._scrollOffset + height,
        );

        for (let i = 0; i < visibleMessages.length; i++) {
            const msg = visibleMessages[i];

            const widget = new ChatMessage({
                role: msg.role,
                content: msg.content,
            });

            let msgX = x;

            if (msg.role === 'user') {
                msgX = x + Math.floor(width / 2);
            } else if (msg.role === 'system') {
                msgX = x + Math.floor(width / 4);
            }

            widget.updateRect({
                x: msgX,
                y: y + i,
                width: Math.floor(width / 2),
                height: 2,
            });

            widget.render(screen);
        }
    }
}
