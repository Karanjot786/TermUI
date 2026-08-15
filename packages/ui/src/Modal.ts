// Modal — overlay dialog with backdrop
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, getBorderChars, caps } from '@termuijs/core';

export interface ModalOptions {
    title?: string;
    width?: number;
    height?: number;
    borderColor?: Style['fg'];
    backdropChar?: string;
    /** Show OK/Cancel buttons. Default: false */
    showButtons?: boolean;
    /** Callback when OK button is activated */
    onConfirm?: () => void;
    /** Callback when Cancel button is activated */
    onCancel?: () => void;
    /** Close on Escape key. Default: true */
    closeOnEscape?: boolean;
    /** Close on Enter key. Default: false */
    closeOnEnter?: boolean;
}

export class Modal extends Widget {
    private _title: string;
    private _modalWidth: number;
    private _modalHeight: number;
    private _borderColor: Style['fg'];
    private _backdropChar: string;
    private _visible = false;
    private _content: Widget | null = null;
    private _showButtons: boolean;
    private _onConfirm?: () => void;
    private _onCancel?: () => void;
    private _closeOnEscape: boolean;
    private _closeOnEnter: boolean;
    private _focusedButton = 0;

    constructor(options: ModalOptions = {}, style?: Partial<Style>) {
        super(mergeStyles(defaultStyle(), { zIndex: 1000, ...style }));
        this._title = options.title ?? '';
        this._modalWidth = options.width ?? 50;
        this._modalHeight = options.height ?? 15;
        this._borderColor = options.borderColor ?? { type: 'named', name: 'cyan' };
        this._backdropChar = options.backdropChar ?? (caps.unicode ? '░' : ' ');
        this._showButtons = options.showButtons ?? false;
        this._onConfirm = options.onConfirm;
        this._onCancel = options.onCancel;
        this._closeOnEscape = options.closeOnEscape ?? true;
        this._closeOnEnter = options.closeOnEnter ?? false;
    }

    get visible(): boolean { return this._visible; }
    show(): void { this._visible = true; this._focusedButton = 0; this.markDirty(); }
    hide(): void { this._visible = false; this.markDirty(); }
    toggle(): void { this._visible = !this._visible; this.markDirty(); }
    setContent(content: Widget): void { this._content = content; this.markDirty(); }

    /** Confirm the dialog (trigger onConfirm callback) */
    confirm(): void {
        if (this._onConfirm) {
            this._onConfirm();
        }
        this.hide();
    }

    /** Cancel the dialog (trigger onCancel callback) */
    cancel(): void {
        if (this._onCancel) {
            this._onCancel();
        }
        this.hide();
    }

    /** Move focus between buttons */
    focusNextButton(): void {
        this._focusedButton = (this._focusedButton + 1) % 2;
        this.markDirty();
    }

    /** Move focus between buttons */
    focusPrevButton(): void {
        this._focusedButton = (this._focusedButton - 1 + 2) % 2;
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (!this._visible) return;

        switch (event.key) {
            case 'escape':
                if (this._closeOnEscape) {
                    event.stopPropagation();
                    this.cancel();
                }
                break;
            case 'enter':
            case 'return':
                if (this._closeOnEnter) {
                    event.stopPropagation();
                    this.confirm();
                } else if (this._showButtons) {
                    event.stopPropagation();
                    if (this._focusedButton === 0) {
                        this.confirm();
                    } else {
                        this.cancel();
                    }
                }
                break;
            case 'tab':
                event.stopPropagation();
                this.focusNextButton();
                break;
            case 'left':
                if (this._showButtons) {
                    event.stopPropagation();
                    this.focusPrevButton();
                }
                break;
            case 'right':
                if (this._showButtons) {
                    event.stopPropagation();
                    this.focusNextButton();
                }
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        if (!this._visible) return;
        const { x, y, width, height } = this._rect;
        const attrs = styleToCellAttrs(this.style);
        // Backdrop
        for (let r = 0; r < height; r++) {
            screen.writeString(x, y + r, this._backdropChar.repeat(width), { ...attrs, dim: true });
        }
        // Centered modal
        const mw = Math.min(this._modalWidth, width - 4);
        const mh = Math.min(this._modalHeight, height - 2);
        const mx = x + Math.floor((width - mw) / 2);
        const my = y + Math.floor((height - mh) / 2);
        const border = getBorderChars('single');
        if (!border) return;
        const bAttrs = { ...attrs, fg: this._borderColor };
        // Title bar
        const titleStr = this._title ? ` ${this._title} ` : '';
        const topFill = mw - 2 - titleStr.length;
        const tl = Math.floor(topFill / 2);
        const tr = topFill - tl;
        screen.writeString(mx, my, border.topLeft + border.top.repeat(tl) + titleStr + border.top.repeat(Math.max(0, tr)) + border.topRight, bAttrs);
        // Sides
        const clr = styleToCellAttrs(this.style);
        for (let r = 1; r < mh - 1; r++) {
            screen.writeString(mx, my + r, border.left, bAttrs);
            screen.writeString(mx + 1, my + r, ' '.repeat(mw - 2), clr);
            screen.writeString(mx + mw - 1, my + r, border.right, bAttrs);
        }
        // Bottom
        screen.writeString(mx, my + mh - 1, border.bottomLeft + border.bottom.repeat(mw - 2) + border.bottomRight, bAttrs);
        // Content
        if (this._content) {
            const contentHeight = this._showButtons ? mh - 4 : mh - 2;
            const cr = { x: mx + 2, y: my + 1, width: mw - 4, height: Math.max(1, contentHeight) };
            this._content.updateRect(cr);
            this._content.render(screen);
        }
        // Buttons
        if (this._showButtons && mh >= 3) {
            const buttonY = my + mh - 2;
            const okLabel = '[ OK ]';
            const cancelLabel = '[ Cancel ]';
            const totalButtonWidth = okLabel.length + 2 + cancelLabel.length;
            const buttonStartX = mx + Math.floor((mw - totalButtonWidth) / 2);
            
            const okAttrs = this._focusedButton === 0
                ? { ...attrs, fg: this._borderColor, bold: true, inverse: true }
                : { ...attrs, fg: this._borderColor };
            const cancelAttrs = this._focusedButton === 1
                ? { ...attrs, fg: this._borderColor, bold: true, inverse: true }
                : { ...attrs, fg: this._borderColor };

            screen.writeString(buttonStartX, buttonY, okLabel, okAttrs);
            screen.writeString(buttonStartX + okLabel.length + 2, buttonY, cancelLabel, cancelAttrs);
        }
        screen.applyBackdropFilter({ x: mx, y: my, width: mw, height: mh });
    }
}
