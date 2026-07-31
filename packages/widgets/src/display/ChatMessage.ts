// ─────────────────────────────────────────────────────
// @termuijs/widgets — ChatMessage widget
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type NamedColor,
    styleToCellAttrs,
    stringWidth,
    truncate,
    wordWrap,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessageOptions {
    role: MessageRole;
    content: string;
    timestamp?: Date;
}

// ── Role configuration ────────────────────────────────

const ROLE_CONFIG: Record<MessageRole, { badge: string; colorName: string }> = {
    user:      { badge: '[User]',      colorName: 'cyan' },
    assistant: { badge: '[Assistant]', colorName: 'green' },
    system:    { badge: '[System]',    colorName: 'yellow' },
    tool:      { badge: '[Tool]',      colorName: 'magenta' },
};

const ROLE_LABELS: Record<MessageRole, string> = {
    user: 'User message',
    assistant: 'Assistant message',
    system: 'System message',
    tool: 'Tool message',
};

// ── ChatMessage widget ────────────────────────────────

/**
 * ChatMessage — displays a single chat message with a colored role badge
 * and word-wrapped content text.
 *
 * Layout:
 *   Row 0: [Role badge] (colored)   optional timestamp (dim, right-aligned)
 *   Row 1..N: content text, word-wrapped, indented 2 spaces
 */
export class ChatMessage extends Widget {
    private _role: MessageRole;
    private _content: string;
    private _timestamp?: Date;
    private _badgeWidth: number;
    private _formattedTimestamp = '';

    private _wrappedLines: string[] = [];
    private _cachedContentWidth = -1;

    constructor(options: ChatMessageOptions, style: Partial<Style> = {}) {
        super(style);
        this._role = options.role;
        this._badgeWidth = stringWidth(ROLE_CONFIG[this._role].badge);
        this._content = options.content;
        this._timestamp = options.timestamp;

        if (this._timestamp) {
            this._formattedTimestamp = this._timestamp.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            });
        }

        this.focusable = false;
        this.setA11y({
            role: 'log',
            label: ROLE_LABELS[this._role],
        });
    }

    /** Update the message content and mark dirty. */
    setContent(content: string): void {
        if (this._content === content) return;
        this._content = content;
        this._wrappedLines = [];
        this._cachedContentWidth = -1;
        this.markDirty();
    }

    /** Update the message role and mark dirty. */
    setRole(role: MessageRole): void {
        if (this._role === role) return;
        this._role = role;
        this._badgeWidth = stringWidth(ROLE_CONFIG[role].badge);
        this.setA11y({
            role: 'log',
            label: ROLE_LABELS[role],
        });
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const config = ROLE_CONFIG[this._role];
        const baseAttrs = styleToCellAttrs(this._style);

        // ── Row 0: badge + optional timestamp ────────────
        const badgeAttrs = {
            ...baseAttrs,
            fg: { type: 'named' as const, name: config.colorName as NamedColor },
        };
        screen.writeString(x, y, config.badge, badgeAttrs);

        if (this._timestamp) {
            const tsWidth = stringWidth(this._formattedTimestamp);
            const tsX = x + width - tsWidth;
            // Only draw if it fits without overlapping the badge
            if (tsX > x + this._badgeWidth) {
                const dimAttrs = { ...baseAttrs, dim: true };
                screen.writeString(tsX, y, this._formattedTimestamp, dimAttrs);
            }
        }

        // ── Rows 1..N: content text ───────────────────────
        if (height <= 1) return;

        const indent = '  ';
        const contentWidth = Math.max(0, width - indent.length);

        if (contentWidth !== this._cachedContentWidth) {
            this._wrappedLines =
                contentWidth > 0
                    ? wordWrap(this._content, contentWidth).split('\n')
                    : [];
            this._cachedContentWidth = contentWidth;
        }

        const lines = this._wrappedLines;
        const maxContentRows = height - 1;

        for (let i = 0; i < Math.min(lines.length, maxContentRows); i++) {
            const line = lines[i];
            if (line === undefined) continue;
            const displayLine = truncate(indent + line, width);
            screen.writeString(x, y + 1 + i, displayLine, baseAttrs);
        }
    }
}
