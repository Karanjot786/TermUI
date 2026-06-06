import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';

export interface CheckboxGroupOption {
    label: string;
    value: string;
}

export interface CheckboxGroupOptions {
    options: CheckboxGroupOption[];
    defaultValues?: string[];
    onChange?: (selectedValues: string[]) => void;
}

export class CheckboxGroup extends Widget {
    private _options: CheckboxGroupOption[];
    private _selected: Set<string>;
    private _focusedIndex = 0;

    onChange?: (selectedValues: string[]) => void;

    focusable = true;

    constructor(options: CheckboxGroupOptions) {
        super(
            mergeStyles(defaultStyle(), {
                height: Math.max(options.options.length, 1),
            })
        );

        this._options = options.options;
        const knownValues = new Set(options.options.map(o => o.value));
        this._selected = new Set(
            (options.defaultValues ?? []).filter(v => knownValues.has(v)),
        );
        this.onChange = options.onChange;
    }

    get selectedValues(): string[] {
        return Array.from(this._selected);
    }

    private emitChange(): void {
        this.onChange?.(this.selectedValues);
    }

    selectNext(): void {
        if (this._focusedIndex < this._options.length - 1) {
            this._focusedIndex++;
            this.markDirty();
        }
    }

    selectPrev(): void {
        if (this._focusedIndex > 0) {
            this._focusedIndex--;
            this.markDirty();
        }
    }

    toggleCurrent(): void {
        const option = this._options[this._focusedIndex];

        if (!option) return;

        if (this._selected.has(option.value)) {
            this._selected.delete(option.value);
        } else {
            this._selected.add(option.value);
        }

        this.emitChange();
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'up':
                this.selectPrev();
                break;

            case 'down':
                this.selectNext();
                break;

            case 'space':
                this.toggleCurrent();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        for (let i = 0; i < this._options.length && i < height; i++) {
            const option = this._options[i];

            const focused = i === this._focusedIndex;
            const checked = this._selected.has(option.value);

            const prefix = focused
                ? (caps.unicode ? '❯ ' : '> ')
                : '  ';

            const checkbox = checked ? '[x]' : '[ ]';

            const text = `${prefix}${checkbox} ${option.label}`;

            screen.writeString(
                x,
                y + i,
                text.slice(0, width),
                {
                    ...attrs,
                    bold: focused,
                }
            );
        }
    }
}