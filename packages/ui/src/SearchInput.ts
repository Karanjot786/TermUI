// ─────────────────────────────────────────────────────
// @termuijs/ui — SearchInput component
//
// A text input with a search-icon prefix, debounced
// onSearch, and Escape-to-clear.
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type KeyEvent,
    type Style,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    truncate,
    caps,
    stringWidth,
    splitGraphemes,
} from '@termuijs/core';

export interface SearchInputOptions {
    placeholder?: string;
    debounce?: number;
    onSearch?: (value: string) => void;
}

export class SearchInput extends Widget {
    private _value = '';
    private _placeholder: string;
    private _debounce: number;
    onSearch?: (value: string) => void;

    private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

    focusable = true;

    constructor(options: SearchInputOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: 1 }));
        this._placeholder = options.placeholder ?? '';
        this._debounce = options.debounce ?? 300;
        this.onSearch = options.onSearch;
    }

    get value(): string { return this._value; }

    setValue(value: string): void {
        if (this._value === value) return;
        this._value = value;
        this.markDirty();
        this._scheduleSearch();
    }

    clear(): void {
        if (this._value === '' && this._debounceTimer === null) return;
        this._value = '';
        this._cancelDebounce();
        this.markDirty();
        this.onSearch?.('');
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'escape':
                this.clear();
                break;
            case 'backspace':
                if (this._value.length > 0) {
                    const graphemes = splitGraphemes(this._value);
                    graphemes.pop();
                    this._value = graphemes.join('');
                    this.markDirty();
                    this._scheduleSearch();
                }
                break;
            default:
                // Single printable character, no modifier keys held
                if (
                    event.key.length === 1
                    && !event.ctrl
                    && !event.alt
                ) {
                    this._value += event.key;
                    this.markDirty();
                    this._scheduleSearch();
                }
                break;
        }
    }

    private _scheduleSearch(): void {
        this._cancelDebounce();
        const value = this._value;
        this._debounceTimer = setTimeout(() => {
            this._debounceTimer = null;
            this.onSearch?.(value);
        }, this._debounce);
    }

    private _cancelDebounce(): void {
        if (this._debounceTimer !== null) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
    }

    override destroy(): void {
        this._cancelDebounce();
        super.destroy();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        const icon = caps.unicode ? '🔍' : '/';
        const prefix = `${icon} `;
        const prefixWidth = stringWidth(prefix);

        const valueOrPlaceholder = this._value.length > 0
            ? this._value
            : this._placeholder;

        const valueAttrs = this._value.length > 0
            ? attrs
            : { ...attrs, dim: true };

        const available = Math.max(0, width - prefixWidth);
        const valueText = truncate(valueOrPlaceholder, available);

        screen.writeString(x, y, prefix, attrs);
        if (valueText.length > 0) {
            screen.writeString(x + prefixWidth, y, valueText, valueAttrs);
        }
    }
}
