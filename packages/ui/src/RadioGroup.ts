// ─────────────────────────────────────────────────────
// @termuijs/ui — RadioGroup widget
//
// Renders a list of options where only one is selectable
// at a time. Up/down arrow keys move the cursor; Enter
// confirms the selection and fires onChange.
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';

export interface RadioGroupOption {
    label: string;
    value: string;
    disabled?: boolean;
}

export interface RadioGroupOptions {
    options: Array<RadioGroupOption>;
    defaultValue?: string;
    onChange?: (value: string) => void;
}

/**
 * RadioGroup — renders a vertical list of mutually exclusive options.
 *
 * Example output (unicode):
 *   (o) Dark
 *   ( ) Light
 *   ( ) System
 */
export class RadioGroup extends Widget {
    private _options: RadioGroupOption[];
    private _selectedValue: string;
    private _focusedIndex: number;

    /** Fires whenever the confirmed selection changes. */
    onChange?: (value: string) => void;

    focusable = true;

    constructor(config: RadioGroupOptions) {
        super(
            mergeStyles(defaultStyle(), {
                height: Math.max(config.options.length, 1),
            })
        );

        this._options = config.options;
        this.onChange = config.onChange;

        // Determine initial selection
        const defaultIndex = config.defaultValue !== undefined
            ? config.options.findIndex((o) => o.value === config.defaultValue)
            : -1;

        // If defaultValue matched a non-disabled option use it; otherwise pick
        // the first enabled option (or index 0 as a safe fallback).
        if (defaultIndex >= 0 && !config.options[defaultIndex]?.disabled) {
            this._selectedValue = config.options[defaultIndex]!.value;
            this._focusedIndex = defaultIndex;
        } else {
            const firstEnabled = config.options.findIndex((o) => !o.disabled);
            this._focusedIndex = firstEnabled >= 0 ? firstEnabled : 0;
            this._selectedValue = config.options[this._focusedIndex]?.value ?? '';
        }
    }

    // ── Accessors ─────────────────────────────────────

    /** The value of the currently confirmed selection. */
    get selectedValue(): string {
        return this._selectedValue;
    }

    /** The index currently under the keyboard cursor. */
    get focusedIndex(): number {
        return this._focusedIndex;
    }

    // ── Navigation ────────────────────────────────────

    /** Move cursor to the next enabled option. */
    selectNext(): void {
        let n = this._focusedIndex + 1;
        while (n < this._options.length && this._options[n]?.disabled) n++;
        if (n < this._options.length) {
            this._focusedIndex = n;
            this.markDirty();
        }
    }

    /** Move cursor to the previous enabled option. */
    selectPrev(): void {
        let n = this._focusedIndex - 1;
        while (n >= 0 && this._options[n]?.disabled) n--;
        if (n >= 0) {
            this._focusedIndex = n;
            this.markDirty();
        }
    }

    /** Confirm the focused option and fire onChange. */
    confirm(): void {
        const option = this._options[this._focusedIndex];
        if (!option || option.disabled) return;
        if (option.value === this._selectedValue) return; // nothing changed
        this._selectedValue = option.value;
        this.markDirty();
        this.onChange?.(this._selectedValue);
    }

    // ── Key handling ──────────────────────────────────

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'up':
                this.selectPrev();
                break;
            case 'down':
                this.selectNext();
                break;
            case 'enter':
                this.confirm();
                break;
        }
    }

    // ── Rendering ─────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        for (let i = 0; i < this._options.length && i < height; i++) {
            const option = this._options[i]!;
            const isFocused = i === this._focusedIndex;
            const isSelected = option.value === this._selectedValue;

            // "(o) Label"  — selected
            // "( ) Label"  — unselected
            // ASCII fallbacks for NO_UNICODE environments
            const radio = isSelected
                ? (caps.unicode ? '(o)' : '(*)')
                : (caps.unicode ? '( )' : '( )');

            const cursor = isFocused
                ? (caps.unicode ? '❯ ' : '> ')
                : '  ';

            const text = `${cursor}${radio} ${option.label}`;

            screen.writeString(
                x,
                y + i,
                text.slice(0, width),
                {
                    ...attrs,
                    bold: isFocused,
                    dim: option.disabled === true,
                    fg: option.disabled
                        ? { type: 'named' as const, name: 'brightBlack' as const }
                        : attrs.fg,
                }
            );
        }
    }
}
