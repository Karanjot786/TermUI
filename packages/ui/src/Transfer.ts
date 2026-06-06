// Transfer — dual-list shuttle selector widget
import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';

export interface TransferItem {
    label: string;
    value: string;
    disabled?: boolean;
}

export interface TransferOptions {
    activeColor?: Style['fg'];
    onChange?: (targetValues: string[]) => void;
}

export class Transfer extends Widget {
    private _sourceItems: TransferItem[];
    private _targetItems: TransferItem[] = [];
    private _sourceCursorIndex = 0;
    private _targetCursorIndex = 0;
    private _activePane: 'source' | 'target' = 'source';
    private _activeColor: Style['fg'];
    private _onChange?: (targetValues: string[]) => void;
    focusable = true;

    constructor(items: TransferItem[], config: TransferOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: Math.max(items.length, 1) }));
        this._sourceItems = [...items];
        this._activeColor = config.activeColor ?? { type: 'named', name: 'cyan' };
        this._onChange = config.onChange;
        this._clampCursors();
    }

    get targetValues(): string[] {
        return this._targetItems.map(item => item.value);
    }

    get sourceValues(): string[] {
        return this._sourceItems.map(item => item.value);
    }

    get targetItems(): TransferItem[] {
        return [...this._targetItems];
    }

    get sourceItems(): TransferItem[] {
        return [...this._sourceItems];
    }

    get activePane(): 'source' | 'target' {
        return this._activePane;
    }

    get sourceCursorIndex(): number {
        return this._sourceCursorIndex;
    }

    get targetCursorIndex(): number {
        return this._targetCursorIndex;
    }

    toggleActivePane(): void {
        this._activePane = this._activePane === 'source' ? 'target' : 'source';
        this.markDirty();
    }

    private _clampCursors(): void {
        if (this._sourceItems.length === 0) {
            this._sourceCursorIndex = 0;
        } else {
            this._sourceCursorIndex = Math.max(0, Math.min(this._sourceCursorIndex, this._sourceItems.length - 1));
        }

        if (this._targetItems.length === 0) {
            this._targetCursorIndex = 0;
        } else {
            this._targetCursorIndex = Math.max(0, Math.min(this._targetCursorIndex, this._targetItems.length - 1));
        }
    }

    selectNext(): void {
        if (this._activePane === 'source') {
            let n = this._sourceCursorIndex + 1;
            while (n < this._sourceItems.length && this._sourceItems[n].disabled) n++;
            if (n < this._sourceItems.length) {
                this._sourceCursorIndex = n;
                this.markDirty();
            }
        } else {
            let n = this._targetCursorIndex + 1;
            while (n < this._targetItems.length && this._targetItems[n].disabled) n++;
            if (n < this._targetItems.length) {
                this._targetCursorIndex = n;
                this.markDirty();
            }
        }
    }

    selectPrev(): void {
        if (this._activePane === 'source') {
            let n = this._sourceCursorIndex - 1;
            while (n >= 0 && this._sourceItems[n].disabled) n--;
            if (n >= 0) {
                this._sourceCursorIndex = n;
                this.markDirty();
            }
        } else {
            let n = this._targetCursorIndex - 1;
            while (n >= 0 && this._targetItems[n].disabled) n--;
            if (n >= 0) {
                this._targetCursorIndex = n;
                this.markDirty();
            }
        }
    }

    transferToTarget(): void {
        if (this._sourceItems.length === 0) return;
        const item = this._sourceItems[this._sourceCursorIndex];
        if (item.disabled) return;

        this._sourceItems.splice(this._sourceCursorIndex, 1);
        this._targetItems.push(item);

        this._clampCursors();
        this.markDirty();
        this._onChange?.(this.targetValues);
    }

    transferToSource(): void {
        if (this._targetItems.length === 0) return;
        const item = this._targetItems[this._targetCursorIndex];
        if (item.disabled) return;

        this._targetItems.splice(this._targetCursorIndex, 1);
        this._sourceItems.push(item);

        this._clampCursors();
        this.markDirty();
        this._onChange?.(this.targetValues);
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'up':
                this.selectPrev();
                break;
            case 'down':
                this.selectNext();
                break;
            case 'tab':
                this.toggleActivePane();
                break;
            case 'right':
                if (this._activePane === 'source') {
                    this.transferToTarget();
                }
                break;
            case 'left':
                if (this._activePane === 'target') {
                    this.transferToSource();
                }
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        const leftPaneWidth = Math.floor((width - 1) / 2);
        const rightPaneWidth = width - 1 - leftPaneWidth;
        if (leftPaneWidth < 0 || rightPaneWidth < 0) return;

        const dividerX = x + leftPaneWidth;
        const dividerChar = caps.unicode ? '│' : '|';
        const indicator = caps.unicode ? '❯ ' : '> ';
        const noIndicator = ' '.repeat(indicator.length);

        for (let i = 0; i < height; i++) {
            // 1. Left pane (source)
            if (i < this._sourceItems.length) {
                const o = this._sourceItems[i];
                const active = this._activePane === 'source' && i === this._sourceCursorIndex;
                const text = (active ? indicator : noIndicator) + o.label;
                const truncatedText = text.slice(0, leftPaneWidth).padEnd(leftPaneWidth, ' ');
                screen.writeString(x, y + i, truncatedText, {
                    ...attrs,
                    fg: o.disabled ? { type: 'named' as const, name: 'brightBlack' as const } : active ? this._activeColor : attrs.fg,
                    bold: active,
                    dim: o.disabled,
                });
            } else {
                screen.writeString(x, y + i, ' '.repeat(leftPaneWidth), attrs);
            }

            // 2. Divider
            screen.setCell(dividerX, y + i, {
                char: dividerChar,
                ...attrs,
            });

            // 3. Right pane (target)
            if (i < this._targetItems.length) {
                const o = this._targetItems[i];
                const active = this._activePane === 'target' && i === this._targetCursorIndex;
                const text = (active ? indicator : noIndicator) + o.label;
                const truncatedText = text.slice(0, rightPaneWidth).padEnd(rightPaneWidth, ' ');
                screen.writeString(dividerX + 1, y + i, truncatedText, {
                    ...attrs,
                    fg: o.disabled ? { type: 'named' as const, name: 'brightBlack' as const } : active ? this._activeColor : attrs.fg,
                    bold: active,
                    dim: o.disabled,
                });
            } else {
                screen.writeString(dividerX + 1, y + i, ' '.repeat(rightPaneWidth), attrs);
            }
        }
    }
}
