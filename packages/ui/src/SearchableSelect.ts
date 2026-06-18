// SearchableSelect — searchable dropdown selector with filtering
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs, caps, truncate } from '@termuijs/core';

export interface SearchableSelectOption {
    label: string;
    value: string;
}

export interface SearchableSelectOptions {
    placeholder?: string;
    activeColor?: Style['fg'];
    onSelect?: (option: SearchableSelectOption, index: number) => void;
}

export class SearchableSelect extends Widget {
    private _allOptions: SearchableSelectOption[] = [];
    private _filteredOptions: SearchableSelectOption[] = [];
    private _searchQuery: string = '';
    private _selectedIndex: number = 0;
    private _placeholder: string;
    private _activeColor: Style['fg'];
    private _onSelect?: (option: SearchableSelectOption, index: number) => void;
    focusable = true;

    constructor(options: SearchableSelectOption[] = [], config: SearchableSelectOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: 5 }));
        this._allOptions = options;
        this._filteredOptions = [...options];
        this._placeholder = config.placeholder ?? 'Search...';
        this._activeColor = config.activeColor ?? { type: 'named', name: 'cyan' };
        this._onSelect = config.onSelect;
    }

    get searchQuery(): string { return this._searchQuery; }
    get filteredOptions(): ReadonlyArray<SearchableSelectOption> { return this._filteredOptions; }
    get selectedIndex(): number { return this._selectedIndex; }

    get selectedOption(): string {
        const opt = this._filteredOptions[this._selectedIndex];
        return opt ? opt.value : '';
    }

    setOptions(options: SearchableSelectOption[]): void {
        this._allOptions = options;
        this._filterOptions();
        this._selectedIndex = 0;
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (event._propagationStopped || event._defaultPrevented) return;
        const char = event.key;

        if (char.length === 1 && !event.ctrl && !event.alt) {
            this._searchQuery += char;
            this._filterOptions();
            this._selectedIndex = 0;
            this.markDirty();
            return;
        }

        if (event.key === 'backspace') {
            this._searchQuery = this._searchQuery.slice(0, -1);
            this._filterOptions();
            this._selectedIndex = 0;
            this.markDirty();
            return;
        }

        if (event.key === 'down') {
            this.selectNext();
            return;
        }

        if (event.key === 'up') {
            this.selectPrev();
            return;
        }

        if (event.key === 'enter' || event.key === 'return') {
            this.confirm();
            return;
        }
    }

    selectNext(): void {
        if (this._selectedIndex < this._filteredOptions.length - 1) {
            this._selectedIndex++;
            this.markDirty();
        }
    }

    selectPrev(): void {
        if (this._selectedIndex > 0) {
            this._selectedIndex--;
            this.markDirty();
        }
    }

    confirm(): void {
        const opt = this._filteredOptions[this._selectedIndex];
        if (opt) {
            this._onSelect?.(opt, this._selectedIndex);
        }
    }

    private _filterOptions(): void {
        if (this._searchQuery === '') {
            this._filteredOptions = [...this._allOptions];
            return;
        }
        const q = this._searchQuery.toLowerCase();
        this._filteredOptions = this._allOptions.filter(
            o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
        );
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;
        const attrs = styleToCellAttrs(this.style);

        const displayText = this._searchQuery.length > 0 ? this._searchQuery : this._placeholder;
        const pointer = caps.unicode ? '➔' : '>';
        const searchLine = pointer + ' ' + displayText;
        const searchStyle = this._searchQuery.length > 0 ? attrs : { ...attrs, dim: true };
        screen.writeString(x, y, truncate(searchLine, width), searchStyle);

        const maxVisible = height - 1;
        const visibleCount = Math.min(this._filteredOptions.length, maxVisible);
        for (let i = 0; i < visibleCount; i++) {
            const opt = this._filteredOptions[i];
            const isSelected = i === this._selectedIndex;
            const prefix = isSelected ? (caps.unicode ? '● ' : '* ') : '  ';
            const line = prefix + opt.label;
            screen.writeString(x, y + 1 + i, truncate(line, width), {
                ...attrs,
                fg: isSelected ? this._activeColor : attrs.fg,
                bold: isSelected,
            });
        }
    }
}
