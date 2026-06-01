import { Widget } from '@termuijs/widgets';
import { Select, SelectOptions, SelectOption } from './Select';

export interface SearchableSelectOptions extends SelectOptions {
    placeholder?: string;
}

export class SearchableSelect extends Select {
    private _searchQuery: string = '';
    private _allOptions: SelectOption[] = [];

    constructor(options: SelectOption[], config: SearchableSelectOptions = {}) {
        super(options, config);
        this._allOptions = [...options];
    }

    public handleKey(key: { name: string; sequence: string }): void {
        if (key.sequence && key.sequence.length === 1 && !key.name) {
            this._searchQuery += key.sequence;
            this._filterOptions();
            return;
        }

        if (key.name === 'backspace') {
            if (this._searchQuery.length > 0) {
                this._searchQuery = this._searchQuery.slice(0, -1);
                this._filterOptions();
            }
            return;
        }

        if (key.name === 'down') { this.selectNext(); return; }
        if (key.name === 'up') { this.selectPrev(); return; }
        if (key.name === 'return' || key.name === 'enter') { this.confirm(); return; }
    }

    private _filterOptions(): void {
        const query = this._searchQuery.toLowerCase();
        const filtered = this._allOptions.filter(option => 
            option.label.toLowerCase().includes(query)
        );

        (this as any)._options = filtered; 
        (this as any)._selectedIndex = 0;
        this.markDirty();
    }

    protected _renderSelf(screen: any): void {
        const searchDisplay = ` Search: ${this._searchQuery}_`;
        screen.writeString(0, 0, searchDisplay);
        super._renderSelf(screen);
    }
}