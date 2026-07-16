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
    prefersReducedMotion,
} from '@termuijs/core';
import { fadeIn, fadeOut } from '@termuijs/motion';
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
    private _animProgress: number;
    private _animCancel?: () => void;

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
        this._animProgress = this._checked ? 1 : 0;
    }

    // ── Public API ──────────────────────────────────────────────────────

    /** Toggle the checked state. No-op if disabled. */
    toggle(): void {
        if (this._disabled) return;
        this.setChecked(!this._checked);
    }

    /** Set the checked state explicitly. No-op if already the same value. */
    setChecked(checked: boolean): void {
        if (this._checked === checked) return;
        this._checked = checked;
        this._onChange?.(this._checked);
        this._animCancel?.();
        this.markDirty();

        if (prefersReducedMotion()) {
            this._animProgress = checked ? 1 : 0;
            return;
        }

        if (checked) {
            this._animProgress = 0;
            this._animCancel = fadeIn(150, (p) => {
                this._animProgress = p;
                this.markDirty();
            }, () => {
                this._animProgress = 1;
                this._animCancel = undefined;
            });
        } else {
            this._animProgress = 1;
            this._animCancel = fadeOut(150, (p) => {
                this._animProgress = p;
                this.markDirty();
            }, () => {
                this._animProgress = 0;
                this._animCancel = undefined;
            });
        }
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

    // ── Lifecycle ───────────────────────────────────────────────────────

    mount(): void {
        super.mount();
        if (this._checked && this._animProgress < 1) {
            this._animProgress = 1;
            this.markDirty();
        }
    }

    /** Cancel any in-flight animation when the widget is unmounted. */
    unmount(): void {
        this._animCancel?.();
        this._animCancel = undefined;
        super.unmount();
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

        const progress = this._animProgress;
        const showMark = progress > 0;
        const mark = showMark ? checkedChar : uncheckedChar;

        // Box: [✓] or [ ]
        const boxOpen = '[';
        const boxClose = ']';
        const box = `${boxOpen}${mark}${boxClose}`;
        const boxWidth = stringWidth(box);

        // Full line: "[✓] Label"
        const gap = ' ';
        const labelPart = this._label;
        const fullLine = box + gap + labelPart;

        // Colors
        const markColor: Color = showMark
            ? this._checkedColor
            : { type: 'named', name: 'white' };

        const labelColor: Color = this._disabled
            ? { type: 'named', name: 'brightBlack' }
            : { type: 'named', name: 'white' };

        const focusColor: Color = { type: 'named', name: 'cyan' };

        // Write '['
        if (width >= 1) {
            screen.setCell(x, y, {
                char: boxOpen,
                fg: this.isFocused ? focusColor : labelColor,
            });
        }

        // Write mark char
        if (width >= 2) {
            screen.setCell(x + 1, y, {
                char: mark,
                fg: markColor,
                dim: showMark && progress < 0.5,
                bold: showMark && progress >= 0.5,
            });
        }

        // Write ']'
        if (width >= 3) {
            screen.setCell(x + 2, y, {
                char: boxClose,
                fg: this.isFocused ? focusColor : labelColor,
            });
        }

        // Write ' Label'
        if (width > 4) {
            const labelX = x + 4;
            const remainingWidth = width - 4;
            screen.writeString(labelX, y, truncate(labelPart, remainingWidth), {
                fg: labelColor,
                dim: this._disabled,
            });
        }
    }
}
