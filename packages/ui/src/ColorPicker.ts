// ─────────────────────────────────────────────────────
// @termuijs/ui — ColorPicker widget
//
// A keyboard-navigable and text-editable ColorPicker.
// - Arrow keys (or hjkl) navigate a 16-color preset grid palette
// - Alphanumeric entry directly edits the hex value input
// - Shows a live swatch preview of the current color
// - Fires onChange(color) when the selection changes
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
    parseColor,
    colorToRgb,
    Color,
    NamedColor
} from '@termuijs/core';

export interface ColorPickerOptions {
    value?: string | Color;
    onChange?: (color: Color) => void;
}

const DEFAULT_PALETTE: NamedColor[] = [
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite'
];

const PALETTE_COLORS: Color[] = DEFAULT_PALETTE.map(name => parseColor(name));

export class ColorPicker extends Widget {
    private _selectedColor: Color;
    private _hexValue = 'ffffff'; // hex digits without '#'
    private _paletteIndex: number | null = null;
    private _onChange?: (color: Color) => void;
    focusable = true;

    constructor(options: ColorPickerOptions = {}) {
        super(mergeStyles(defaultStyle(), { border: 'single', height: 7 }));
        
        const initialValue = options.value ?? '#ffffff';
        if (typeof initialValue === 'string') {
            const parsed = parseColor(initialValue);
            this._selectedColor = parsed.type !== 'none' ? parsed : parseColor('#ffffff');
        } else {
            this._selectedColor = initialValue.type !== 'none' ? initialValue : parseColor('#ffffff');
        }

        this._hexValue = this._colorToHexStr(this._selectedColor);
        this._onChange = options.onChange;

        // Determine if initial color is in the palette
        const matchIdx = PALETTE_COLORS.findIndex(c => this._colorsEqual(c, this._selectedColor));
        this._paletteIndex = matchIdx !== -1 ? matchIdx : null;
    }

    get value(): Color {
        return this._selectedColor;
    }

    set value(val: string | Color) {
        let newColor: Color;
        if (typeof val === 'string') {
            const parsed = parseColor(val);
            newColor = parsed.type !== 'none' ? parsed : parseColor('#ffffff');
        } else {
            newColor = val.type !== 'none' ? val : parseColor('#ffffff');
        }

        this._selectedColor = newColor;
        this._hexValue = this._colorToHexStr(newColor);

        const matchIdx = PALETTE_COLORS.findIndex(c => this._colorsEqual(c, newColor));
        this._paletteIndex = matchIdx !== -1 ? matchIdx : null;

        this.markDirty();
    }

    private _colorToHexStr(color: Color): string {
        const [r, g, b] = colorToRgb(color);
        return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    private _colorsEqual(c1: Color, c2: Color): boolean {
        const rgb1 = colorToRgb(c1);
        const rgb2 = colorToRgb(c2);
        return rgb1[0] === rgb2[0] && rgb1[1] === rgb2[1] && rgb1[2] === rgb2[2];
    }

    private _updateFromHexInput(): void {
        const fullHex = '#' + this._hexValue;
        const parsed = parseColor(fullHex);
        if (parsed.type !== 'none') {
            this._selectedColor = parsed;
            const matchIdx = PALETTE_COLORS.findIndex(c => this._colorsEqual(c, parsed));
            this._paletteIndex = matchIdx !== -1 ? matchIdx : null;
            this._onChange?.(parsed);
        }
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        let index = this._paletteIndex ?? 0;
        let paletteChanged = false;

        switch (event.key) {
            case 'left':
            case 'h':
                if (event.key === 'left' || (!event.ctrl && !event.alt)) {
                    if (index > 0) {
                        index--;
                        paletteChanged = true;
                    }
                }
                break;

            case 'right':
            case 'l':
                if (event.key === 'right' || (!event.ctrl && !event.alt)) {
                    if (index < 15) {
                        index++;
                        paletteChanged = true;
                    }
                }
                break;

            case 'up':
            case 'k':
                if (event.key === 'up' || (!event.ctrl && !event.alt)) {
                    if (index >= 8) {
                        index -= 8;
                        paletteChanged = true;
                    }
                }
                break;

            case 'down':
            case 'j':
                if (event.key === 'down' || (!event.ctrl && !event.alt)) {
                    if (index < 8) {
                        index += 8;
                        paletteChanged = true;
                    }
                }
                break;

            case 'backspace':
                if (this._hexValue.length > 0) {
                    this._hexValue = this._hexValue.slice(0, -1);
                    this._updateFromHexInput();
                }
                break;

            default:
                if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
                    const char = event.key.toLowerCase();
                    if (/^[0-9a-f]$/.test(char) && this._hexValue.length < 6) {
                        this._hexValue += char;
                        this._updateFromHexInput();
                    }
                }
                break;
        }

        if (paletteChanged) {
            this._paletteIndex = index;
            const newColor = PALETTE_COLORS[index];
            this._selectedColor = newColor;
            this._hexValue = this._colorToHexStr(newColor);
            this._onChange?.(newColor);
            this.markDirty();
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // 1. Render Palette Grid (Row 0 and 1)
        const symbol = caps.unicode ? '■' : 'o';

        for (let r = 0; r < 2; r++) {
            const rowY = y + r;
            if (rowY >= y + height) break;

            for (let c = 0; c < 8; c++) {
                const index = r * 8 + c;
                const cellX = x + c * 4;
                if (cellX >= x + width) continue;

                const color = PALETTE_COLORS[index];
                const isSelected = this._paletteIndex === index;

                if (isSelected) {
                    screen.writeString(cellX, rowY, '[', attrs);
                    screen.writeString(cellX + 1, rowY, symbol, { ...attrs, fg: color, bold: true });
                    screen.writeString(cellX + 2, rowY, ']', attrs);
                } else {
                    screen.writeString(cellX + 1, rowY, symbol, { ...attrs, fg: color });
                }
            }
        }

        if (height < 4) return;

        // 2. Render Hex Input & Live Swatch Line (Row 3)
        const hexPrefix = 'Hex: #';
        const hexFull = hexPrefix + this._hexValue;
        screen.writeString(x, y + 3, hexFull, attrs);

        // Render input cursor if focused
        if (this.isFocused) {
            const cursorX = x + hexFull.length;
            if (cursorX < x + width) {
                screen.setCell(cursorX, y + 3, {
                    char: ' ',
                    ...attrs,
                    inverse: true
                });
            }
        }

        // Render Swatch next to it (starting at col 20 to give plenty of space for "Hex: #ffffff ")
        const swatchX = x + 20;
        if (swatchX < x + width) {
            const swatchLabel = 'Swatch: ';
            screen.writeString(swatchX, y + 3, swatchLabel, attrs);

            const swatchTextX = swatchX + swatchLabel.length;
            if (swatchTextX < x + width) {
                const swatchBlocks = caps.unicode ? '████' : '####';
                screen.writeString(swatchTextX, y + 3, swatchBlocks, {
                    ...attrs,
                    fg: this._selectedColor,
                    bg: this._selectedColor
                });
            }
        }
    }
}
