// MultiSelect — checkbox-style multi-item selector
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps, truncate } from '@termuijs/core';

export interface MultiSelectOption { label: string; value: string; disabled?: boolean; }
export interface MultiSelectOptions {
    activeColor?: Style['fg'];
    checkChar?: string;
    uncheckChar?: string;
    onSubmit?: (selected: MultiSelectOption[]) => void;
    /** Allow select all / deselect all shortcuts. Default: true */
    allowSelectAll?: boolean;
}

export class MultiSelect extends Widget {
    private _options: MultiSelectOption[];
    private _cursorIndex = 0;
    private _checked: Set<number> = new Set();
    private _activeColor: Style['fg'];
    private _checkChar: string;
    private _uncheckChar: string;
    private _onSubmit?: (selected: MultiSelectOption[]) => void;
    private _allowSelectAll: boolean;
    private _filterText = '';
    private _filteredIndices: number[] = [];
    focusable = true;

    constructor(options: MultiSelectOption[], config: MultiSelectOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: Math.max(options.length, 1) }));
        this._options = options;
        this._activeColor = config.activeColor ?? { type: 'named', name: 'cyan' };
        this._checkChar = config.checkChar ?? (caps.unicode ? '◼' : '[x]');
        this._uncheckChar = config.uncheckChar ?? (caps.unicode ? '◻' : '[ ]');
        this._onSubmit = config.onSubmit;
        this._allowSelectAll = config.allowSelectAll ?? true;
        this._updateFilter();
    }

    get selectedOptions(): MultiSelectOption[] {
        return [...this._checked].sort().map(i => this._options[i]);
    }
    selectNext(): void { 
        if (this._filteredIndices.length === 0) return; 
        let n = this._cursorIndex + 1; 
        while (n < this._filteredIndices.length && this._options[this._filteredIndices[n]].disabled) n++; 
        if (n < this._filteredIndices.length) { this._cursorIndex = n; this.markDirty(); } 
    }
    selectPrev(): void { 
        if (this._filteredIndices.length === 0) return; 
        let n = this._cursorIndex - 1; 
        while (n >= 0 && this._options[this._filteredIndices[n]].disabled) n--; 
        if (n >= 0) { this._cursorIndex = n; this.markDirty(); } 
    }
    toggleCurrent(): void {
        const originalIndex = this._filteredIndices[this._cursorIndex];
        const o = this._options[originalIndex];
        if (o && !o.disabled) { this._checked.has(originalIndex) ? this._checked.delete(originalIndex) : this._checked.add(originalIndex); this.markDirty(); }
    }
    submit(): void { this._onSubmit?.(this.selectedOptions); }

    /** Select all non-disabled options */
    selectAll(): void {
        if (!this._allowSelectAll) return;
        this._options.forEach((_, i) => {
            if (!this._options[i].disabled) this._checked.add(i);
        });
        this.markDirty();
    }

    /** Deselect all options */
    deselectAll(): void {
        if (!this._allowSelectAll) return;
        this._checked.clear();
        this.markDirty();
    }

    /** Filter options by search query */
    filter(query: string): void {
        this._filterText = query.toLowerCase();
        this._updateFilter();
        this._cursorIndex = Math.min(this._cursorIndex, Math.max(0, this._filteredIndices.length - 1));
        this.markDirty();
    }

    /** Clear filter and show all options */
    clearFilter(): void {
        this._filterText = '';
        this._updateFilter();
        this._cursorIndex = 0;
        this.markDirty();
    }

    /** Get current filter text */
    getFilterText(): string {
        return this._filterText;
    }

    private _updateFilter(): void {
        if (!this._filterText) {
            this._filteredIndices = this._options.map((_, i) => i);
        } else {
            this._filteredIndices = this._options
                .map((o, i) => ({ o, i }))
                .filter(({ o }) => o.label.toLowerCase().includes(this._filterText))
                .map(({ i }) => i);
        }
    }

    handleKey(event: KeyEvent): void {
        if (event.ctrl && event.key === 'a' && this._allowSelectAll) {
            event.stopPropagation();
            this.selectAll();
            return;
        }
        if (event.ctrl && event.key === 'd') {
            event.stopPropagation();
            this.deselectAll();
            return;
        }
        if (event.key === '/') {
            event.stopPropagation();
            this._filterText = '';
            this._cursorIndex = 0;
            this.markDirty();
            return;
        }
        if (event.key === 'backspace' && this._filterText.length > 0) {
            event.stopPropagation();
            this._filterText = this._filterText.slice(0, -1);
            this._updateFilter();
            this._cursorIndex = Math.min(this._cursorIndex, Math.max(0, this._filteredIndices.length - 1));
            this.markDirty();
            return;
        }
        if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
            event.stopPropagation();
            this._filterText += event.key.toLowerCase();
            this._updateFilter();
            this._cursorIndex = Math.min(this._cursorIndex, Math.max(0, this._filteredIndices.length - 1));
            this.markDirty();
            return;
        }
        switch (event.key) {
            case 'up':
                event.stopPropagation();
                this.selectPrev();
                break;
            case 'down':
                event.stopPropagation();
                this.selectNext();
                break;
            case ' ':
            case 'space':
                event.stopPropagation();
                this.toggleCurrent();
                break;
            case 'enter':
            case 'return':
                event.stopPropagation();
                this.submit();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;
        const attrs = styleToCellAttrs(this.style);
        let row = 0;

        // Show filter indicator if filtering
        if (this._filterText) {
            const filterLabel = `Filter: ${this._filterText}`;
            screen.writeString(x, y + row, truncate(filterLabel, width), { ...attrs, dim: true });
            row++;
        }

        for (let i = 0; i < this._filteredIndices.length && row < height; i++) {
            const originalIndex = this._filteredIndices[i];
            const o = this._options[originalIndex];
            const active = i === this._cursorIndex;
            const checked = this._checked.has(originalIndex);
            const label = `${active ? (caps.unicode ? '❯ ' : '> ') : '  '}${checked ? this._checkChar : this._uncheckChar} ${o.label}`;
            screen.writeString(x, y + row, label.slice(0, width), {
                ...attrs,
                fg: o.disabled ? { type: 'named' as const, name: 'brightBlack' as const } : active ? this._activeColor : attrs.fg,
                bold: active, dim: o.disabled,
            });
            row++;
        }
    }
}
