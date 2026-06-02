// SortPrompt — sortable item list
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface SortPromptOptions {
    activeColor?: Style['fg'];
    onSubmit?: (items: string[]) => void;
}

export class SortPrompt extends Widget {
    private _items: string[];
    private _cursorIndex = 0;
    private _activeColor: Style['fg'];
    private _onSubmit?: (items: string[]) => void;
    focusable = true;

    constructor(items: string[], options: SortPromptOptions = {}) {
        super(mergeStyles(defaultStyle(), { flexGrow: 1 }));
        this._items = [...items];
        this._activeColor = options.activeColor ?? { type: 'named', name: 'cyan' };
        this._onSubmit = options.onSubmit;
    }

    selectNext(): void {
        if (this._cursorIndex < this._items.length - 1) {
            this._cursorIndex++;
            this.markDirty();
        }
    }

    selectPrev(): void {
        if (this._cursorIndex > 0) {
            this._cursorIndex--;
            this.markDirty();
        }
    }

    moveItemUp(): void {
        if (this._cursorIndex > 0) {
            const temp = this._items[this._cursorIndex];
            this._items[this._cursorIndex] = this._items[this._cursorIndex - 1];
            this._items[this._cursorIndex - 1] = temp;
            this._cursorIndex--;
            this.markDirty();
        }
    }

    moveItemDown(): void {
        if (this._cursorIndex < this._items.length - 1) {
            const temp = this._items[this._cursorIndex];
            this._items[this._cursorIndex] = this._items[this._cursorIndex + 1];
            this._items[this._cursorIndex + 1] = temp;
            this._cursorIndex++;
            this.markDirty();
        }
    }

    submit(): void {
        this._onSubmit?.(this._items);
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'shift+up':
                this.moveItemUp();
                break;

            case 'shift+down':
                this.moveItemDown();
                break;

            case 'enter':
                this.submit();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        for (let i = 0; i < this._items.length && i < height; i++) {
            const active = i === this._cursorIndex;
            const indicator = active ? (caps.unicode ? '◉ ' : '> ') : '  ';
            const line = `${indicator}${this._items[i]}`;

            screen.writeString(
                x,
                y + i,
                line.slice(0, width),
                {
                    ...attrs,
                    fg: active ? this._activeColor : attrs.fg,
                    bold: active,
                },
            );
        }
    }
}