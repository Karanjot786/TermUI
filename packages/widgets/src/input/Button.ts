// ─────────────────────────────────────────────────────
// @termuijs/widgets — Button widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, type KeyEvent, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';

export interface ButtonOptions {
    variant?: ButtonVariant;
    disabled?: boolean;
    onPress?: () => void;
    color?: Color;
}

/** Background colors for each variant */
const BG_COLORS: Record<ButtonVariant, Color> = {
    default: { type: 'named', name: 'brightBlack' },
    primary: { type: 'named', name: 'blue' },
    danger: { type: 'named', name: 'red' },
    ghost: { type: 'named', name: 'brightBlack' },
};

/** Foreground colors for each variant */
const FG_COLORS: Record<ButtonVariant, Color> = {
    default: { type: 'named', name: 'white' },
    primary: { type: 'named', name: 'white' },
    danger: { type: 'named', name: 'white' },
    ghost: { type: 'named', name: 'white' },
};

/**
 * Button — a pressable button with a label and visual variants.
 *
 * Renders a button with different visual styles based on variant.
 * Handles key events for activation when not disabled.
 */
export class Button extends Widget {
    private _label: string;
    private _variant: ButtonVariant;
    private _disabled: boolean;
    private _onPress?: () => void;
    private _color?: Color;

    constructor(label: string, style: Partial<Style> = {}, opts: ButtonOptions = {}) {
        super(style);
        this._label = label;
        this._variant = opts.variant ?? 'default';
        this._disabled = opts.disabled ?? false;
        this._onPress = opts.onPress;
        this._color = opts.color;
        this.focusable = true;
    }

    setLabel(label: string): void {
        if (this._label === label) return;

        this._label = label;
        this.markDirty();
    }

    setDisabled(disabled: boolean): void {
        if (this._disabled === disabled) return;
        
        this._disabled = disabled;
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (this._disabled) return;

        if (event.key === 'enter' || event.key === 'space') {
            this._onPress?.();
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const bg = this._color ?? BG_COLORS[this._variant];
        const fg = FG_COLORS[this._variant];
        // Focus indicator: use accent color when focused
        const borderFg = this.isFocused
            ? { type: 'named' as const, name: 'cyan' as const }
            : fg;

        // Choose border characters based on unicode support
        const tl = caps.unicode ? '┌' : '+';
        const tr = caps.unicode ? '┐' : '+';
        const bl = caps.unicode ? '└' : '+';
        const br = caps.unicode ? '┘' : '+';
        const hz = caps.unicode ? '─' : '-';
        const vt = caps.unicode ? '│' : '|';

        // Padded text: " label "
        const padded = ` ${this._label} `;
        const textWidth = stringWidth(padded);

        // Inner width is the area between left and right border
        const innerWidth = Math.min(textWidth, Math.max(0, width - 2));

        // ── Row 0: top border ──
        if (height >= 1) {
            screen.setCell(x, y, { char: tl, fg: borderFg, bg });
            for (let c = 1; c <= innerWidth; c++) {
                screen.setCell(x + c, y, { char: hz, fg: borderFg, bg });
            }
            if (innerWidth + 1 < width) {
                screen.setCell(x + innerWidth + 1, y, { char: tr, fg: borderFg, bg });
            }
        }

        // ── Row 1: content row ──
        if (height >= 2) {
            screen.setCell(x, y + 1, { char: vt, fg: borderFg, bg });
            
            // Center the text in the available width
            const startX = x + 1;
            const textStartX = startX + Math.floor((innerWidth - textWidth) / 2);
            
            // Write the centered label
            screen.writeString(textStartX, y + 1, padded, { fg: borderFg, bg });
            
            // Fill remaining space with background
            for (let c = textStartX + textWidth; c < startX + innerWidth; c++) {
                screen.setCell(c, y + 1, { char: ' ', fg: borderFg, bg });
            }
            
            if (innerWidth + 1 < width) {
                screen.setCell(x + innerWidth + 1, y + 1, { char: vt, fg: borderFg, bg });
            }
        }

        // ── Row 2: bottom border ──
        if (height >= 3) {
            screen.setCell(x, y + 2, { char: bl, fg: borderFg, bg });
            for (let c = 1; c <= innerWidth; c++) {
                screen.setCell(x + c, y + 2, { char: hz, fg: borderFg, bg });
            }
            if (innerWidth + 1 < width) {
                screen.setCell(x + innerWidth + 1, y + 2, { char: br, fg: borderFg, bg });
            }
        }
    }
}