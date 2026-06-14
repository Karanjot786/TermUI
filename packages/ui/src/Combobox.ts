// Combobox — text input with inline filtered dropdown
import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
    stringWidth,
    truncate
} from '@termuijs/core';

export interface ComboboxOption {
    label: string;
    value: string;
}

export interface ComboboxOptions {
    placeholder?: string;
    activeColor?: Style['fg'];
    onSelect?: (value: string) => void;
}

export class Combobox extends Widget {
    private _options: ComboboxOption[];
    private _placeholder: string;
    private _activeColor: Style['fg'];
    private _onSelect?: (value: string) => void;

    private _inputValue = '';
    private _committedValue = '';
    private _isOpen = false;
    private _selectedIndex = -1;
    focusable = true;

    constructor(options: ComboboxOption[], config?: ComboboxOptions) {
        super(mergeStyles(defaultStyle(), { height: 6, focusRingStyle: 'none' }));
        this._options = options;
        this._placeholder = config?.placeholder ?? '';
        this._activeColor = config?.activeColor ?? { type: 'named', name: 'cyan' };
        this._onSelect = config?.onSelect;
    }

    get value(): string {
        return this._committedValue;
    }

    get filtered(): ComboboxOption[] {
        const query = this._inputValue.toLowerCase();
        return this._options.filter(option =>
            option.label.toLowerCase().includes(query)
        );
    }

    handleKey(event: KeyEvent): void {
        const key = event.key;
        const filtered = this.filtered;

        if (key === 'down') {
            this._isOpen = true;
            if (filtered.length > 0) {
                this._selectedIndex = (this._selectedIndex + 1) % filtered.length;
            }
            this.markDirty();
            return;
        }

        if (key === 'up') {
            this._isOpen = true;
            if (filtered.length > 0) {
                if (this._selectedIndex <= 0) {
                    this._selectedIndex = filtered.length - 1;
                } else {
                    this._selectedIndex--;
                }
            }
            this.markDirty();
            return;
        }

        if (key === 'escape') {
            if (!this._isOpen && this._selectedIndex === -1) {
                return;
            }
        
            this._isOpen = false;
            this._selectedIndex = -1;
            this.markDirty();
            return;
        }

        if (key === 'enter') {
            if (this._isOpen && this._selectedIndex >= 0 && this._selectedIndex < filtered.length) {
                const selected = filtered[this._selectedIndex];
                this._committedValue = selected.value;
                this._inputValue = selected.label;
                this._onSelect?.(selected.value);
            } else {
                this._committedValue = this._inputValue;
                this._onSelect?.(this._inputValue);
            }
            this._isOpen = false;
            this._selectedIndex = -1;
            this.markDirty();
            return;
        }

        if (key === 'backspace') {
            if (this._inputValue.length === 0) {
                return;
            }
        
            this._inputValue = this._inputValue.slice(0, -1);
            this._isOpen = true;
            this._selectedIndex = -1;
            this.markDirty();
            return;
        }

        if (key.length === 1 && !event.ctrl && !event.alt) {
            this._inputValue += key;
            this._isOpen = true;
            this._selectedIndex = -1;
            this.markDirty();
            return;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        const prefix = this._isOpen ? (caps.unicode ? '▼ ' : 'v ') : (caps.unicode ? '▶ ' : '> ');
        const prefixWidth = stringWidth(prefix);

        const isPlaceholder = this._inputValue === '' && !this.isFocused;
        const displayText = this._inputValue !== '' ? this._inputValue : (this.isFocused ? '' : this._placeholder);

        screen.writeString(x, y, prefix + truncate(displayText, width - prefixWidth), {
            ...attrs,
            fg: isPlaceholder ? { type: 'named', name: 'brightBlack' } : attrs.fg,
        });

        if (this.isFocused) {
            const cursorX = x + prefixWidth + stringWidth(truncate(this._inputValue, width - prefixWidth));
            if (cursorX < x + width) {
                screen.setCell(cursorX, y, {
                    char: ' ',
                    ...attrs,
                    inverse: true,
                });
            }
        }

        const filtered = this.filtered;
        if (this._isOpen && this.isFocused && filtered.length > 0) {
            const renderCount = Math.min(filtered.length, height - 1);
            for (let i = 0; i < renderCount; i++) {
                const option = filtered[i];
                const isSelected = i === this._selectedIndex;
                const rowY = y + 1 + i;
                if (rowY >= y + height) break;

                const marker = isSelected ? (caps.unicode ? '● ' : '* ') : '  ';
                const itemText = truncate(option.label, width - stringWidth(marker));

                screen.writeString(x, rowY, marker + itemText, {
                    ...attrs,
                    fg: isSelected ? this._activeColor : attrs.fg,
                    bold: isSelected,
                });
            }
        }
    }
}
