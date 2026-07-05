// ─────────────────────────────────────────────────────
// @termuijs/ui — AgentChat compound widget
//
// A split-pane AI agent chat UI:
//   ┌─────────────────────────────┐
//   │ Title            in:0 out:0 │  ← header
//   ├─────────────────────────────┤
//   │ [Assistant]                 │
//   │   Hello! How can I help?    │  ← ChatThread (scrollable)
//   │ [User]                      │
//   │   Tell me a joke            │
//   │ [Assistant]                 │
//   │   ...                       │  ← TypingIndicator (while thinking)
//   ├─────────────────────────────┤
//   │ > ▌                         │  ← TextInput (fixed)
//   ├─────────────────────────────┤
//   │ [Enter] Send  [Ctrl+C] Quit │  ← help bar
//   └─────────────────────────────┘
//
// Usage:
//   const chat = new AgentChat({
//     title: 'My Agent',
//     welcomeMessage: 'Hello! How can I help?',
//     onQuery: async function* (msg) {
//       yield 'Echo: ';
//       yield msg;
//     },
//   });
// ─────────────────────────────────────────────────────

import { Widget, Box, Text } from '@termuijs/widgets';
import {
    type Screen,
    type KeyEvent,
    type Style,
    mergeStyles,
    defaultStyle,
    truncate,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';
import { ChatThread } from './ChatThread.js';

// ── Public API types ───────────────────────────────────────────────────────

/**
 * Callback that the AgentChat calls for each user message.
 * Yield tokens progressively to stream the response.
 */
export type AgentQueryFn = (message: string) => AsyncGenerator<string>;

export interface AgentChatOptions {
    /** Widget title shown in the header bar. Default: "Agent Chat". */
    title?: string;
    /** Placeholder text shown in the empty input field. */
    placeholder?: string;
    /**
     * Initial assistant message shown on startup.
     * If omitted no welcome message is added.
     */
    welcomeMessage?: string;
    /**
     * Called every time the user submits a message.
     * Yield string tokens to stream the assistant response.
     */
    onQuery: AgentQueryFn;
    /** Style overrides for the outer container. */
    style?: Partial<Style>;
}

// ── Internal helpers ──────────────────────────────────────────────────────

/**
 * AgentInputBar — fixed one-line input row at the bottom of AgentChat.
 * Renders a coloured prompt glyph followed by the current text and a blinking
 * cursor when focused.
 */
class AgentInputBar extends Widget {
    private _value = '';
    private _cursorPos = 0;
    private _placeholder: string;
    private _locked = false;

    private _onChange?: (value: string) => void;
    private _onSubmit?: (value: string) => void;

    focusable = true;

    constructor(
        style: Partial<Style> = {},
        opts: {
            placeholder?: string;
            onChange?: (value: string) => void;
            onSubmit?: (value: string) => void;
        } = {},
    ) {
        super(mergeStyles(defaultStyle(), { height: 3, border: 'single' }, style));
        this._placeholder = opts.placeholder ?? 'Type a message and press Enter…';
        this._onChange = opts.onChange;
        this._onSubmit = opts.onSubmit;
    }

    get value(): string {
        return this._value;
    }

    /** Lock input while the agent is responding. */
    setLocked(locked: boolean): void {
        this._locked = locked;
        this.markDirty();
    }

    isLocked(): boolean {
        return this._locked;
    }

    insertChar(ch: string): void {
        if (this._locked) return;
        this._value =
            this._value.slice(0, this._cursorPos) +
            ch +
            this._value.slice(this._cursorPos);
        this._cursorPos++;
        this._onChange?.(this._value);
        this.markDirty();
    }

    deleteBack(): void {
        if (this._locked || this._cursorPos === 0) return;
        this._value =
            this._value.slice(0, this._cursorPos - 1) +
            this._value.slice(this._cursorPos);
        this._cursorPos--;
        this._onChange?.(this._value);
        this.markDirty();
    }

    moveLeft(): void {
        if (this._cursorPos > 0) {
            this._cursorPos--;
            this.markDirty();
        }
    }

    moveRight(): void {
        if (this._cursorPos < this._value.length) {
            this._cursorPos++;
            this.markDirty();
        }
    }

    submit(): void {
        if (this._locked || !this._value.trim()) return;
        const val = this._value;
        this._value = '';
        this._cursorPos = 0;
        this.markDirty();
        this._onSubmit?.(val);
    }

    handleKey(event: KeyEvent): void {
        if (this._locked) return;

        switch (event.key) {
            case 'enter':
                this.submit();
                break;

            case 'backspace':
                this.deleteBack();
                break;

            case 'left':
                this.moveLeft();
                break;

            case 'right':
                this.moveRight();
                break;

            default:
                if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
                    this.insertChar(event.key);
                }
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Prompt glyph
        const prompt = caps.unicode ? '❯ ' : '> ';
        const promptFg = this._locked
            ? { type: 'named' as const, name: 'brightBlack' as const }
            : { type: 'named' as const, name: 'green' as const };

        screen.writeString(x, y, prompt, { ...attrs, fg: promptFg, bold: true });

        const inputX = x + prompt.length;
        const inputWidth = Math.max(0, width - prompt.length);

        if (inputWidth <= 0) return;

        if (this._locked) {
            // Show waiting indicator while locked
            const waitText = caps.unicode ? 'Agent is responding…' : 'Agent is responding...';
            screen.writeString(inputX, y, truncate(waitText, inputWidth), {
                ...attrs,
                dim: true,
                fg: { type: 'named' as const, name: 'brightBlack' as const },
            });
            return;
        }

        const display = this._value || '';

        // Determine visible window so cursor is always on-screen
        const cursorPos = this._cursorPos;
        const viewStart = Math.max(0, cursorPos - inputWidth + 2);
        const visible = display.slice(viewStart, viewStart + inputWidth - 1);

        if (display.length === 0) {
            // Placeholder
            screen.writeString(inputX, y, truncate(this._placeholder, inputWidth), {
                ...attrs,
                dim: true,
            });
            // Draw cursor on placeholder
            screen.setCell(inputX, y, {
                char: this._placeholder[0] ?? ' ',
                fg: { type: 'named' as const, name: 'brightBlack' as const },
                bg: this.isFocused
                    ? { type: 'named' as const, name: 'white' as const }
                    : undefined,
            });
            return;
        }

        screen.writeString(inputX, y, visible, attrs);

        // Draw cursor
        const cursorScreenX = inputX + (cursorPos - viewStart);
        if (cursorScreenX >= inputX && cursorScreenX < inputX + inputWidth) {
            const cursorChar = display[cursorPos] ?? ' ';
            screen.setCell(cursorScreenX, y, {
                char: cursorChar,
                bg: this.isFocused
                    ? { type: 'named' as const, name: 'white' as const }
                    : undefined,
                fg: { type: 'named' as const, name: 'black' as const },
            });
        }
    }
}

// ── AgentStatusBar ────────────────────────────────────────────────────────

/** One-line header showing title, model/status, and token counts. */
class AgentStatusBar extends Widget {
    private _title: string;
    private _status: string;
    private _inputTokens = 0;
    private _outputTokens = 0;

    constructor(title: string, style: Partial<Style> = {}) {
        super(mergeStyles(defaultStyle(), { height: 1 }, style));
        this._title = title;
        this._status = 'ready';
    }

    setStatus(status: string): void {
        this._status = status;
        this.markDirty();
    }

    addTokens(input: number, output: number): void {
        this._inputTokens += input;
        this._outputTokens += output;
        this.markDirty();
    }

    resetTokens(): void {
        this._inputTokens = 0;
        this._outputTokens = 0;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Title (bold cyan)
        const titleStr = ` ${this._title} `;
        screen.writeString(x, y, titleStr, {
            ...attrs,
            bold: true,
            fg: { type: 'named' as const, name: 'cyan' as const },
        });

        // Status (dim, right of title)
        const statusStr = `[${this._status}]`;
        const statusX = x + titleStr.length + 1;
        if (statusX + statusStr.length < x + width) {
            screen.writeString(statusX, y, statusStr, {
                ...attrs,
                dim: true,
                fg: { type: 'named' as const, name: 'yellow' as const },
            });
        }

        // Token counts (right-aligned)
        const tokenStr = `in:${this._inputTokens} out:${this._outputTokens}`;
        const tokenX = x + width - tokenStr.length;
        if (tokenX > statusX + statusStr.length + 1) {
            screen.writeString(tokenX, y, tokenStr, {
                ...attrs,
                dim: true,
                fg: { type: 'named' as const, name: 'brightBlack' as const },
            });
        }
    }
}

// ── AgentChat ─────────────────────────────────────────────────────────────

/**
 * AgentChat — a full split-pane AI agent chat component.
 *
 * Provides:
 * - Scrollable message history (via ChatThread)
 * - Animated typing indicator while the agent is responding
 * - Locked input while waiting for a response
 * - Token usage display in the header
 * - Pluggable `onQuery` async generator for any AI backend
 *
 * @example
 * ```ts
 * const chat = new AgentChat({
 *   title: 'My AI Agent',
 *   welcomeMessage: 'Hello! How can I help you today?',
 *   onQuery: async function* (msg) {
 *     yield 'Echo: ';
 *     yield msg;
 *   },
 * });
 * ```
 */
export class AgentChat extends Widget {
    private _statusBar: AgentStatusBar;
    private _thread: ChatThread;
    private _typingRow: Box;
    private _typingLabel: Text;
    private _typingVisible = false;
    private _inputBar: AgentInputBar;
    private _helpBar: Text;
    private _onQuery: AgentQueryFn;
    private _isResponding = false;

    focusable = true;

    constructor(options: AgentChatOptions) {
        super(
            mergeStyles(defaultStyle(), {
                flexDirection: 'column',
                flexGrow: 1,
                padding: 1,
                gap: 0,
                ...(options.style ?? {}),
            }),
        );

        const title = options.title ?? 'Agent Chat';
        this._onQuery = options.onQuery;

        // ── Header ──────────────────────────────────────────────────────────
        this._statusBar = new AgentStatusBar(title, {
            border: 'single',
            borderColor: { type: 'named', name: 'brightBlack' },
            height: 3,
        });

        // ── Chat thread (scrollable output pane) ─────────────────────────
        this._thread = new ChatThread({ showScrollbar: true });
        this._thread.setStyle({ flexGrow: 1 });

        // ── Typing indicator row ─────────────────────────────────────────
        this._typingRow = new Box({
            flexDirection: 'row',
            height: 1,
            visible: false,
            padding: { top: 0, bottom: 0, left: 2, right: 2 },
        });
        this._typingLabel = new Text('', {
            fg: { type: 'named', name: 'brightBlack' },
        });
        this._typingRow.addChild(this._typingLabel);

        // ── Input bar ───────────────────────────────────────────────────
        this._inputBar = new AgentInputBar(
            {
                border: 'single',
                borderColor: { type: 'named', name: 'brightBlack' },
            },
            {
                placeholder: options.placeholder,
                onSubmit: (val) => this._handleSend(val),
            },
        );
        this._inputBar.isFocused = true;

        // ── Help bar ────────────────────────────────────────────────────
        const helpText = caps.unicode
            ? ' [Enter] Send  [←/→] Move cursor  [Ctrl+C] Quit '
            : ' [Enter] Send  [Left/Right] Move  [Ctrl+C] Quit ';
        this._helpBar = new Text(helpText, {
            dim: true,
            height: 1,
            fg: { type: 'named', name: 'brightBlack' },
        });

        // ── Assemble widget tree ─────────────────────────────────────────
        this.addChild(this._statusBar);
        this.addChild(this._thread);
        this.addChild(this._typingRow);
        this.addChild(this._inputBar);
        this.addChild(this._helpBar);

        // Welcome message
        if (options.welcomeMessage) {
            this._thread.addMessage({
                role: 'assistant',
                content: options.welcomeMessage,
            });
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private _showTyping(show: boolean): void {
        if (this._typingVisible === show) return;
        this._typingVisible = show;

        if (show) {
            this._typingLabel.setContent(
                caps.unicode ? 'Agent is thinking…' : 'Agent is thinking...',
            );
            this._typingRow.setStyle({ visible: true });
        } else {
            this._typingRow.setStyle({ visible: false });
        }
        this.markDirty();
    }

    private async _handleSend(text: string): Promise<void> {
        const trimmed = text.trim();
        if (!trimmed || this._isResponding) return;

        this._isResponding = true;
        this._inputBar.setLocked(true);
        this._statusBar.setStatus('responding');
        this._showTyping(true);
        this.markDirty();

        // Add user message
        this._thread.addMessage({ role: 'user', content: trimmed });

        // Estimate input tokens (4 chars ≈ 1 token)
        const inputEst = Math.ceil(trimmed.length / 4);
        this._statusBar.addTokens(inputEst, 0);

        let fullResponse = '';

        // Create a placeholder assistant message that we update token-by-token
        const assistantMsg = this._thread.addMessage({
            role: 'assistant',
            content: '',
        });

        try {
            const stream = this._onQuery(trimmed);
            for await (const token of stream) {
                fullResponse += token;
                this._thread.updateMessageContent(assistantMsg, fullResponse);
                this._statusBar.addTokens(0, 1);
                this.markDirty();
            }
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            this._thread.updateMessageContent(
                assistantMsg,
                `[error] ${errMsg}`,
            );
        } finally {
            this._isResponding = false;
            this._inputBar.setLocked(false);
            this._inputBar.isFocused = true;
            this._showTyping(false);
            this._statusBar.setStatus('ready');
            this.markDirty();
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────

    /** Returns true when the agent is currently generating a response. */
    isResponding(): boolean {
        return this._isResponding;
    }

    /** Programmatically add a message to the thread. */
    addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
        this._thread.addMessage({ role, content });
        this.markDirty();
    }

    /** Reset token counters. */
    resetTokens(): void {
        this._statusBar.resetTokens();
    }

    // ── Key handling ───────────────────────────────────────────────────────

    handleKey(event: KeyEvent): boolean {
        // Quit
        if (event.ctrl && event.key === 'c') {
            return false;
        }

        // Route all other keys to the input bar
        this._inputBar.handleKey(event);
        return true;
    }

    protected _renderSelf(_screen: Screen): void {
        // Rendering is handled entirely by child widgets.
    }
}
