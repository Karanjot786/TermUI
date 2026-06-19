// ─────────────────────────────────────────────────────
// @termuijs/widgets — Checkbox widget
// A toggleable boolean input with label and keyboard support
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type Color,
    type KeyEvent,
    stringWidth,
    truncate,
    caps,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface CheckboxOptions {
    /** Initial checked state. Default: false */
    checked?: boolean;
    /** Callback fired when checked state changes */
    onChange?: (checked: boolean) => void;
    /** Character shown when checked. Default: '✓' (unicode) or '+' (ASCII) */
    checkedChar?: string;
    /** Character shown when unchecked. Default: ' ' */
    uncheckedChar?: string;
    /** Whether the checkbox is disabled. Default: false */
    disabled?: boolean;
    /** Color of the check mark. Default: green */
    checkedColor?: Color;
}

/**
 * Checkbox — a toggleable boolean input with a label.
 *
 * Renders as:
 *   [✓] Enable notifications   (checked)
 *   [ ] Enable notifications   (unchecked)
 *
 * Press Enter or Space to toggle.
 * Unicode fallback: uses '+' for checked, ' ' for unchecked.
 */
export class Checkbox extends Widget {
    private _label: string;
    private _checked: boolean;
    private _disabled: boolean;
    private _onChange?: (checked: boolean) => void;
    private _checkedChar?: string;
    private _uncheckedChar?: string;
    private _checkedColor: Color;

    constructor(
        label: string,
        style: Partial<Style> = {},
        opts: CheckboxOptions = {},
    ) {
        super(style);
        this.focusable = true;
        this._label = label;
        this._checked = opts.checked ?? false;
        this._disabled = opts.disabled ?? false;
        this._onChange = opts.onChange;
        this._checkedChar = opts.checkedChar;
        this._uncheckedChar = opts.uncheckedChar;
        this._checkedColor = opts.checkedColor ?? { type: 'named', name: 'green' };
    }

    // ── Public API ──────────────────────────────────────────────────────

    /** Toggle the checked state. No-op if disabled. */
    toggle(): void {
        if (this._disabled) return;
        this._checked = !this._checked;
        this._onChange?.(this._checked);
        this.markDirty();
    }

    /** Set the checked state explicitly. No-op if already the same value. */
    setChecked(checked: boolean): void {
        if (this._checked === checked) return;
        this._checked = checked;
        this._onChange?.(this._checked);
        this.markDirty();
    }

    /** Returns the current checked state. */
    isChecked(): boolean {
        return this._checked;
    }

    /** Update the label text. No-op if unchanged. */
    setLabel(label: string): void {
        if (this._label === label) return;
        this._label = label;
        this.markDirty();
    }

    /** Get the current label. */
    getLabel(): string {
        return this._label;
    }

    /** Enable or disable the checkbox. No-op if unchanged. */
    setDisabled(disabled: boolean): void {
        if (this._disabled === disabled) return;
        this._disabled = disabled;
        this.markDirty();
    }

    /** Returns true if the checkbox is disabled. */
    isDisabled(): boolean {
        return this._disabled;
    }

    // ── Keyboard ────────────────────────────────────────────────────────

    /** Handle key events. Enter and Space toggle the checkbox. */
    handleKey(event: KeyEvent): void {
        if (this._disabled) return;
        if (event.key === 'enter' || event.key === 'space') {
            this.toggle();
        }
    }

    // ── Render ──────────────────────────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        // Resolve chars at render time so caps.unicode is current
        const checkedChar = this._checkedChar ?? (caps.unicode ? '✓' : '+');
        const uncheckedChar = this._uncheckedChar ?? ' ';

        // Box: [✓] or [ ]
        const boxOpen = '[';
        const boxClose = ']';
        const mark = this._checked ? checkedChar : uncheckedChar;

        const box = `${boxOpen}${mark}${boxClose}`;
        const boxWidth = stringWidth(box);

        // Full line: "[✓] Label"
        const gap = ' ';
        const labelPart = this._label;
        const fullLine = box + gap + labelPart;

        // Colors
        const markColor: Color = this._checked
            ? this._checkedColor
            : { type: 'named', name: 'white' };

        const labelColor: Color = this._disabled
            ? { type: 'named', name: 'brightBlack' }
            : { type: 'named', name: 'white' };

        const focusColor: Color = { type: 'named', name: 'cyan' };

        if (stringWidth(fullLine) > width) {
            // Not enough room — render truncated
            screen.writeString(x, y, truncate(fullLine, width), { fg: labelColor });
            return;
        }

        // Write '['
        screen.setCell(x, y, {
            char: boxOpen,
            fg: this.isFocused ? focusColor : labelColor,
        });

        // Write mark char
        screen.setCell(x + 1, y, {
            char: mark,
            fg: markColor,
            bold: this._checked,
        });

        // Write ']'
        screen.setCell(x + 2, y, {
            char: boxClose,
            fg: this.isFocused ? focusColor : labelColor,
        });

        // Write ' Label'
        const labelX = x + boxWidth + stringWidth(gap);
        screen.writeString(labelX, y, labelPart, {
            fg: labelColor,
            dim: this._disabled,
        });
    }
}
