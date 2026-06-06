// Toast — auto-dismiss notification
import { Widget } from '@termuijs/widgets';
import { type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export interface ToastMessage { text: string; type: ToastType; expireAt: number; }
export interface ToastOptions {
    position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
    durationMs?: number;
    maxVisible?: number;
    /** Enable screen reader announcements (default: true) */
    announce?: boolean;
}

const ICONS_UNICODE: Record<ToastType, string> = { info: 'ℹ', success: '✓', warning: '⚠', error: '✗' };
const ICONS_ASCII: Record<ToastType, string> = { info: 'i', success: '+', warning: '!', error: 'x' };
const COLORS: Record<ToastType, string> = { info: 'cyan', success: 'green', warning: 'yellow', error: 'red' };

export class Toast extends Widget {
    private _messages: ToastMessage[] = [];
    private _position: string;
    private _durationMs: number;
    private _maxVisible: number;
    private _announce: boolean;

    constructor(options: ToastOptions = {}) {
        super(mergeStyles(defaultStyle(), {}));
        this._position = options.position ?? 'top-right';
        this._durationMs = options.durationMs ?? 3000;
        this._maxVisible = options.maxVisible ?? 5;
        this._announce = options.announce ?? true;
    }

        push(text: string, type: ToastType = 'info'): void {
        this._messages.push({ text, type, expireAt: Date.now() + this._durationMs });
        this.markDirty();
        if (this._announce) {
            this._announceToScreenReader(text, type);
        }
    }
    info(text: string): void { this.push(text, 'info'); }
    success(text: string): void { this.push(text, 'success'); }
    warning(text: string): void { this.push(text, 'warning'); }
    error(text: string): void { this.push(text, 'error'); }

    private _announceToScreenReader(text: string, _type: ToastType): void {
        try {
            const announcement = `[${text}]`;
            const oscSequence = `\x1b]777;notify;TermUI;${announcement}\x07`;
            process.stderr.write(oscSequence);
        } catch {
            // Silently fail if stderr is not writable
        }
    }
    protected _renderSelf(screen: Screen): void {
        const now = Date.now();
        this._messages = this._messages.filter(m => m.expireAt > now);
        if (this._messages.length === 0) return;
        const { x, y, width, height } = this._rect;
        const visible = this._messages.slice(-this._maxVisible);
        const tw = Math.min(40, width - 2);
        const isRight = this._position.includes('right');
        const isBottom = this._position.includes('bottom');
        const sx = isRight ? x + width - tw - 1 : x + 1;
        const sy = isBottom ? y + height - visible.length - 1 : y + 1;
        const icons = caps.unicode ? ICONS_UNICODE : ICONS_ASCII;
        const attrs = styleToCellAttrs(this.style);
        for (let i = 0; i < visible.length; i++) {
            const m = visible[i];
            const label = ` ${icons[m.type]} ${m.text} `.slice(0, tw).padEnd(tw);
            screen.writeString(sx, sy + i, label, { ...attrs, fg: { type: 'named', name: COLORS[m.type] as any }, bold: true });
        }
    }
}
