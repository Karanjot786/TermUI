import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type KeyEvent,
    type Style,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    getBorderChars,
} from '@termuijs/core';
import { type AIAdapter } from './index.js';
import { LocalVectorStore, indexDirectory, type DocumentChunk } from './vectorStore.js';

export interface RAGChatOptions {
    ai: AIAdapter;
    vectorStore: LocalVectorStore;
    docsPath: string; // Directory containing markdown/text documents to index
    maxContextChunks?: number; // default: 3
    borderColor?: string;
    onError?: (error: Error) => void;
}

function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    for (const para of paragraphs) {
        if (!para) {
            lines.push('');
            continue;
        }
        const words = para.split(' ');
        let currentLine = '';
        for (const word of words) {
            if ((currentLine + ' ' + word).trim().length <= maxWidth) {
                currentLine = currentLine ? currentLine + ' ' + word : word;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);
    }
    return lines;
}

export class RAGChat extends Widget {
    private _ai: AIAdapter;
    private _vectorStore: LocalVectorStore;
    private _docsPath: string;
    private _maxContextChunks: number;
    private _borderColor: Style['fg'];

    private _messages: { role: 'user' | 'assistant'; content: string }[] = [];
    private _query = '';
    private _cursorPos = 0;
    private _scrollIndex = 0;
    private _loading = false;
    private _indexing = false;

    focusable = true;

    public onError?: (error: Error) => void;

    constructor(style: Partial<Style> = {}, opts?: RAGChatOptions) {
        super(mergeStyles(defaultStyle(), { border: 'none', focusRingStyle: 'none', height: 20, ...style }));

        if (!opts) {
            throw new Error('RAGChat options are required');
        }

        this._ai = opts.ai;
        this._vectorStore = opts.vectorStore;
        this._docsPath = opts.docsPath;
        this._maxContextChunks = opts.maxContextChunks ?? 3;
        this.onError = opts.onError;

        const borderClr = opts.borderColor ?? 'cyan';
        this._borderColor = typeof borderClr === 'string'
            ? { type: 'named', name: borderClr as any } // Cast needed because named color string doesn't match the Style['fg'] union shape directly
            : borderClr;

        this._initIndex().catch(err => {
            this._handleError(err);
        });
    }

    protected _handleError(error: unknown): void {
        const err = error instanceof Error ? error : new Error(String(error));
        if (this.onError) {
            this.onError(err);
        }
        // Cast needed: Widget event typings do not include custom 'error', but runtime emitter supports it.
        (this.events as any).emit('error', err);
    }

    private async _initIndex(): Promise<void> {
        this._indexing = true;
        this._loading = true;
        this.markDirty();
        try {
            await this._vectorStore.load();
            await indexDirectory(this._docsPath, this._vectorStore, this._ai);
            await this._vectorStore.save();
        } finally {
            this._indexing = false;
            this._loading = false;
            this.markDirty();
        }
    }

    private async _submitQuery(query: string): Promise<void> {
        if (!query.trim() || this._loading) return;

        this._loading = true;
        this._messages.push({ role: 'user', content: query });
        this._query = '';
        this._cursorPos = 0;
        this.markDirty();

        try {
            const chunks = await this._vectorStore.query(query, this._ai, this._maxContextChunks);
            const contextText = chunks.map((c: DocumentChunk) => c.text).join('\n---\n');

            const systemInstructions = `Use the following context from the local documentation to answer the user's query.\n\nContext:\n${contextText}`;

            const prompt = `${systemInstructions}\n\nQuery: ${query}`;

            this._messages.push({ role: 'assistant', content: '' });
            const assistantIndex = this._messages.length - 1;

            const stream = this._ai.chat([{ role: 'user', content: prompt }]);
            for await (const chunk of stream) {
                this._messages[assistantIndex].content += chunk;
                this.markDirty();
            }
        } catch (error) {
            this._handleError(error);
            this._messages.push({
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            });
        } finally {
            this._loading = false;
            this.markDirty();
        }
    }

    handleKey(event: KeyEvent): void {
        if (event.key === 'tab') return; // let focus bubble

        if (this._loading && event.key !== 'escape') {
            return;
        }

        switch (event.key) {
            case 'up':
                if (this._scrollIndex > 0) {
                    this._scrollIndex--;
                    this.markDirty();
                }
                break;
            case 'down':
                this._scrollIndex++;
                this.markDirty();
                break;
            case 'enter':
                if (this._query.trim()) {
                    this._submitQuery(this._query);
                }
                break;
            case 'backspace':
                if (this._cursorPos > 0) {
                    this._query = this._query.slice(0, this._cursorPos - 1) + this._query.slice(this._cursorPos);
                    this._cursorPos--;
                    this.markDirty();
                }
                break;
            case 'left':
                if (this._cursorPos > 0) {
                    this._cursorPos--;
                    this.markDirty();
                }
                break;
            case 'right':
                if (this._cursorPos < this._query.length) {
                    this._cursorPos++;
                    this.markDirty();
                }
                break;
            default:
                if (event.key.length === 1) {
                    this._query = this._query.slice(0, this._cursorPos) + event.key + this._query.slice(this._cursorPos);
                    this._cursorPos++;
                    this.markDirty();
                }
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        const border = getBorderChars('single');
        if (!border) return;
        // Cast needed: border style 'fg' type expects specific Color union, so { type: 'named', name: 'dim' } is cast as any for compatibility.
        const ba = { ...attrs, fg: this.isFocused ? this._borderColor : { type: 'named', name: 'dim' } as any };

        // Outer box
        screen.writeString(x, y, border.topLeft + border.top.repeat(width - 2) + border.topRight, ba);
        for (let r = 1; r < height - 1; r++) {
            screen.writeString(x, y + r, border.left, ba);
            screen.writeString(x + width - 1, y + r, border.right, ba);
        }
        screen.writeString(x, y + height - 1, border.bottomLeft + border.bottom.repeat(width - 2) + border.bottomRight, ba);

        // Content variables
        const messageAreaHeight = height - 7;
        const separatorY = y + height - 5;
        const inputY = separatorY + 1;
        const inputHeight = 3;

        // Draw separator
        screen.writeString(x, separatorY, border.left + '─'.repeat(width - 2) + border.right, ba);

        // Word-wrap and format all messages
        const formattedLines: { text: string; fg?: Style['fg'] }[] = [];
        for (const msg of this._messages) {
            const wrapWidth = width - 6;
            const lines = wrapText(msg.content, wrapWidth);
            const prefix = msg.role === 'user' ? 'You: ' : 'AI: ';
            // Cast needed: Color type mismatches with CellAttr's fg field expecting discrete types, so user color is cast as any.
            const fgColor = msg.role === 'user' ? ({ type: 'named', name: 'green' } as any) : undefined;
            for (let i = 0; i < lines.length; i++) {
                if (i === 0) {
                    formattedLines.push({ text: prefix + lines[i], fg: fgColor });
                } else {
                    formattedLines.push({ text: '    ' + lines[i], fg: fgColor });
                }
            }
            formattedLines.push({ text: '' });
        }

        // Adjust scroll offset
        const totalLines = formattedLines.length;
        const maxScroll = Math.max(0, totalLines - messageAreaHeight);
        if (this._loading || this._indexing) {
            this._scrollIndex = maxScroll;
        }
        this._scrollIndex = Math.min(this._scrollIndex, maxScroll);
        this._scrollIndex = Math.max(0, this._scrollIndex);

        // Render messages
        const visibleLines = formattedLines.slice(this._scrollIndex, this._scrollIndex + messageAreaHeight);
        for (let r = 0; r < messageAreaHeight; r++) {
            const lineY = y + 1 + r;
            if (r < visibleLines.length) {
                const line = visibleLines[r];
                screen.writeString(x + 2, lineY, line.text.slice(0, width - 4), { ...attrs, fg: line.fg ?? attrs.fg });
            }
        }

        // Render indexing / loading state in a subtle corner badge
        if (this._indexing) {
            // Cast needed: Color literal string or named structure is cast as any due to library-specific CellAttr type mismatches.
            screen.writeString(x + width - 15, y, '[ Indexing... ]', { ...attrs, fg: { type: 'named', name: 'yellow' } as any });
        } else if (this._loading) {
            // Cast needed: Color literal string or named structure is cast as any due to library-specific CellAttr type mismatches.
            screen.writeString(x + width - 15, y, '[ Thinking... ]', { ...attrs, fg: { type: 'named', name: 'yellow' } as any });
        }

        // Render multiline input box cleanly
        const inputWidth = width - 6;
        const wrappedInput: string[] = [];
        let offset = 0;
        while (offset < this._query.length) {
            wrappedInput.push(this._query.slice(offset, offset + inputWidth));
            offset += inputWidth;
        }
        if (wrappedInput.length === 0) {
            wrappedInput.push('');
        }

        // Draw input placeholder or text
        if (this._query.length === 0 && !this.isFocused) {
            screen.writeString(x + 2, inputY, 'Ask a question against docs...', { ...attrs, dim: true });
        } else {
            for (let r = 0; r < inputHeight; r++) {
                if (r < wrappedInput.length) {
                    screen.writeString(x + 2, inputY + r, wrappedInput[r], attrs);
                }
            }
        }

        // Render Cursor
        if (this.isFocused && !this._loading) {
            const cursorRow = Math.floor(this._cursorPos / inputWidth);
            const cursorCol = this._cursorPos % inputWidth;
            if (cursorRow < inputHeight) {
                const rowText = wrappedInput[cursorRow] ?? '';
                const cursorChar = cursorCol < rowText.length ? rowText[cursorCol] : ' ';
                screen.setCell(x + 2 + cursorCol, inputY + cursorRow, {
                    char: cursorChar,
                    ...attrs,
                    inverse: true,
                });
            }
        }
    }
}
