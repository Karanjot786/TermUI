import {
    type Screen,
    type Style,
    styleToCellAttrs,
    truncate,
    stringWidth,
} from "@termuijs/core";
import { Widget } from "../base/Widget.js";

export interface AutocompleteItem {
    id: string;
    label: string;
    description?: string;
}

export interface AutocompleteOptions {
    placeholder?: string;
    maxVisible?: number;

    items?: AutocompleteItem[];

    loadSuggestions?: (
        query: string
    ) => Promise<AutocompleteItem[]> | AutocompleteItem[];

    onSelect?: (item: AutocompleteItem) => void;
}

export class Autocomplete extends Widget {
    private _query = "";
    private _items: AutocompleteItem[] = [];
    private _filtered: AutocompleteItem[] = [];
    private _selectedIndex = 0;

    constructor(
        private _options: AutocompleteOptions,
        style: Partial<Style> = {}
    ) {
        super({
            border: "single",
            ...style,
        });

        this.focusable = true;

        this._items = _options.items ?? [];
        this._filtered = [...this._items];
    }

    protected _renderSelf(screen: Screen): void {
        // render later
    }
}