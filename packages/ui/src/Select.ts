// Select — single-item dropdown selector
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface SelectOption { label: string; value: string; disabled?: boolean; }
export interface SelectOptions {
    placeholder?: string;
    activeColor?: Style['fg'];
    onSelect?: (option: SelectOption, index: number) => void;
}

export class Select extends Widget {
    private _options: SelectOption[];
    private _selectedIndex = 0;
    private _isOpen = false;
    private _placeholder: string;
    private _activeColor: Style['fg'];
    private _onSelect?: (option: SelectOption, index: number) => void;
    focusable = true;

    constructor(options: SelectOption[], config: SelectOptions = {}, style?: Partial<Style>) {
        super(mergeStyles(mergeStyles(defaultStyle(), { height: 1 }), style ?? {}));
        this._options = options;
        this._placeholder = config.placeholder ?? 'Select...';
        this._activeColor = config.activeColor ?? { type: 'named', name: 'cyan' };
        this._onSelect = config.onSelect;
    }

    get selectedOption(): SelectOption | undefined { return this._options[this._selectedIndex]; }
    get selectedIndex(): number { return this._selectedIndex; }
    get isOpen(): boolean { return this._isOpen; }
    open(): void { this._isOpen = true; this.markDirty(); }
    close(): void { this._isOpen = false; this.markDirty(); }
    toggle(): void { this._isOpen = !this._isOpen; this.markDirty(); }

    selectNext(): void {
        let n = this._selectedIndex + 1;
        while (n < this._options.length && this._options[n].disabled) n++;
        if (n < this._options.length) { this._selectedIndex = n; this.markDirty(); }
    }
    selectPrev(): void {
        let n = this._selectedIndex - 1;
        while (n >= 0 && this._options[n].disabled) n--;
        if (n >= 0) { this._selectedIndex = n; this.markDirty(); }
    }
    confirm(): void {
        const opt = this._options[this._selectedIndex];
        if (opt && !opt.disabled) { this._onSelect?.(opt, this._selectedIndex); this._isOpen = false; this.markDirty(); }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;
        if (width <= 0) return;
        const attrs = styleToCellAttrs(this.style);
        const sel = this._options[this._selectedIndex];
        const label = sel ? sel.label : this._placeholder;
        const prefix = this._isOpen ? (caps.unicode ? '▼ ' : 'v ') : (caps.unicode ? '▶ ' : '> ');
        screen.writeString(x, y, prefix + label.slice(0, width - 2), { ...attrs, fg: this._activeColor });
        if (this._isOpen) {
            for (let i = 0; i < this._options.length; i++) {
                const o = this._options[i];
                const isSel = i === this._selectedIndex;
                const m = isSel ? (caps.unicode ? '● ' : '* ') : '  ';
                screen.writeString(x, y + 1 + i, m + o.label.slice(0, width - 2), {
                    ...attrs,
                    fg: o.disabled ? { type: 'named' as const, name: 'brightBlack' as const } : isSel ? this._activeColor : attrs.fg,
                    bold: isSel, dim: o.disabled,
                });
            }
        }
    }
}
