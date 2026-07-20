// MultiSelect — checkbox-style multi-item selector
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface MultiSelectOption { label: string; value: string; disabled?: boolean; }
export interface MultiSelectOptions {
    activeColor?: Style['fg'];
    checkChar?: string;
    uncheckChar?: string;
    onSubmit?: (selected: MultiSelectOption[]) => void;
}

export class MultiSelect extends Widget {
    private _options: MultiSelectOption[];
    private _cursorIndex = 0;
    private _checked: Set<number> = new Set();
    private _activeColor: Style['fg'];
    private _checkChar: string;
    private _uncheckChar: string;
    private _onSubmit?: (selected: MultiSelectOption[]) => void;
    focusable = true;

    constructor(options: MultiSelectOption[], config: MultiSelectOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: Math.max(options.length, 1) }));
        this._options = options;
        this._activeColor = config.activeColor ?? { type: 'named', name: 'cyan' };
        this._checkChar = config.checkChar ?? (caps.unicode ? '◼' : '[x]');
        this._uncheckChar = config.uncheckChar ?? (caps.unicode ? '◻' : '[ ]');
        this._onSubmit = config.onSubmit;
    }

    get selectedOptions(): MultiSelectOption[] {
        return [...this._checked].sort().map(i => this._options[i]);
    }
    selectNext(): void { let n = this._cursorIndex + 1; while (n < this._options.length && this._options[n].disabled) n++; if (n < this._options.length) { this._cursorIndex = n; this.markDirty(); } }
    selectPrev(): void { let n = this._cursorIndex - 1; while (n >= 0 && this._options[n].disabled) n--; if (n >= 0) { this._cursorIndex = n; this.markDirty(); } }
    toggleCurrent(): void {
        const o = this._options[this._cursorIndex];
        if (o && !o.disabled) { this._checked.has(this._cursorIndex) ? this._checked.delete(this._cursorIndex) : this._checked.add(this._cursorIndex); this.markDirty(); }
    }
    submit(): void { this._onSubmit?.(this.selectedOptions); }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;
        const attrs = styleToCellAttrs(this.style);
        for (let i = 0; i < this._options.length && i < height; i++) {
            const o = this._options[i];
            const active = i === this._cursorIndex;
            const checked = this._checked.has(i);
            const label = `${active ? (caps.unicode ? '❯ ' : '> ') : '  '}${checked ? this._checkChar : this._uncheckChar} ${o.label}`;
            screen.writeString(x, y + i, label.slice(0, width), {
                ...attrs,
                fg: o.disabled ? { type: 'named' as const, name: 'brightBlack' as const } : active ? this._activeColor : attrs.fg,
                bold: active, dim: o.disabled,
            });
        }
    }
}
