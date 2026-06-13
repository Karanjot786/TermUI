// ConfirmDialog — yes/no prompt overlay
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs, getBorderChars } from '@termuijs/core';

export interface ConfirmDialogOptions {
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    borderColor?: Style['fg'];
    onConfirm?: () => void;
    onCancel?: () => void;
}

export class ConfirmDialog extends Widget {
    private _message: string;
    private _confirmLabel: string;
    private _cancelLabel: string;
    private _borderColor: Style['fg'];
    private _selected: 'confirm' | 'cancel' = 'confirm';
    private _visible = false;
    private _onConfirm?: () => void;
    private _onCancel?: () => void;
    focusable = true;

    constructor(options: ConfirmDialogOptions) {
        super(mergeStyles(defaultStyle(), {}));
        this._message = options.message;
        this._confirmLabel = options.confirmLabel ?? 'Yes';
        this._cancelLabel = options.cancelLabel ?? 'No';
        this._borderColor = options.borderColor ?? { type: 'named', name: 'yellow' };
        this._onConfirm = options.onConfirm;
        this._onCancel = options.onCancel;
        this.events.on('key', (event) => this.handleKey(event));
    }

    get visible(): boolean { return this._visible; }
    show(): void { this._visible = true; this._selected = 'confirm'; this.markDirty(); }
    hide(): void { this._visible = false; this.markDirty(); }
    selectConfirm(): void { this._selected = 'confirm'; this.markDirty(); }
    selectCancel(): void { this._selected = 'cancel'; this.markDirty(); }
    toggleSelection(): void { this._selected = this._selected === 'confirm' ? 'cancel' : 'confirm'; this.markDirty(); }
    confirm(): void {
        (this._selected === 'confirm' ? this._onConfirm : this._onCancel)?.();
        this._visible = false;
        this.markDirty();
    }

    private handleKey(event: KeyEvent): void {
        if (!this._visible) return;
        if (event.key === 'escape') {
            this.selectCancel();
            this.confirm();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    protected _renderSelf(screen: Screen): void {
        if (!this._visible) return;
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;
        const attrs = styleToCellAttrs(this.style);
        for (let r = 0; r < height; r++) screen.writeString(x, y + r, '░'.repeat(width), { ...attrs, dim: true });
        const bw = Math.min(40, width - 4);
        const bh = 5;
        if (bw < 2 || height < bh) return;
        const bx = x + Math.floor((width - bw) / 2);
        const by = y + Math.floor((height - bh) / 2);
        const border = getBorderChars('single');
        if (!border) return;
        const ba = { ...attrs, fg: this._borderColor };
        screen.writeString(bx, by, border.topLeft + border.top.repeat(bw - 2) + border.topRight, ba);
        for (let r = 1; r < bh - 1; r++) {
            screen.writeString(bx, by + r, border.left, ba);
            screen.writeString(bx + 1, by + r, ' '.repeat(bw - 2), attrs);
            screen.writeString(bx + bw - 1, by + r, border.right, ba);
        }
        screen.writeString(bx, by + bh - 1, border.bottomLeft + border.bottom.repeat(bw - 2) + border.bottomRight, ba);
        screen.writeString(bx + 2, by + 1, this._message.slice(0, bw - 4), { ...attrs, bold: true });
        const yesStr = this._selected === 'confirm' ? ` [${this._confirmLabel}] ` : `  ${this._confirmLabel}  `;
        const noStr = this._selected === 'cancel' ? ` [${this._cancelLabel}] ` : `  ${this._cancelLabel}  `;
        screen.writeString(bx + 2, by + 3, yesStr, { ...attrs, fg: this._selected === 'confirm' ? { type: 'named', name: 'green' } : attrs.fg, bold: this._selected === 'confirm' });
        screen.writeString(bx + 2 + yesStr.length + 2, by + 3, noStr, { ...attrs, fg: this._selected === 'cancel' ? { type: 'named', name: 'red' } : attrs.fg, bold: this._selected === 'cancel' });
    }
}
