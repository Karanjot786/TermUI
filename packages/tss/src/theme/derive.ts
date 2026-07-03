import { parseColor, colorToRgb } from '@termuijs/core';
import { rgbToHex } from '../color-functions.js';

export interface NormalColorPair {
    fg: string;
    bg: string;
}

export interface DerivedThemeRole {
    fg: string;
    bg?: string;
    bold?: true;
    italic?: true;
}

export interface DerivedTheme {
    Normal: { fg: string; bg: string };
    Focus: { fg: string; bg: string };
    Active: { fg: string; bg: string; bold: true };
    Disabled: { fg: string; bg: string };
    Highlight: { fg: string; bg: string; italic: true };
}

function toHex(color: string): string {
    const parsed = parseColor(color);
    if (parsed.type === 'none') {
        throw new Error(`Invalid color: ${color}`);
    }
    const [r, g, b] = colorToRgb(parsed);
    return rgbToHex(r, g, b);
}


function brighten(color: string, amount = 0.15): string {
    const [r, g, b] = colorToRgb(parseColor(color));
    return rgbToHex(
        Math.round(r + (255 - r) * amount),
        Math.round(g + (255 - g) * amount),
        Math.round(b + (255 - b) * amount)
    );
}

function dim(color: string, factor = 0.2995): string {
    const [r, g, b] = colorToRgb(parseColor(color));
    return rgbToHex(
        Math.round(r * factor),
        Math.round(g * factor),
        Math.round(b * factor)
    );
}

export function deriveTheme(input: { Normal: NormalColorPair }): DerivedTheme {
    const normalFg = toHex(input.Normal.fg);
    const normalBg = toHex(input.Normal.bg);

    const focusFg = normalBg;
    const focusBg = normalFg;

    return {
        Normal: { fg: normalFg, bg: normalBg },
        Focus: { fg: focusFg, bg: focusBg },
        Active: {
            fg: brighten(focusFg),
            bg: brighten(focusBg),
            bold: true,
        },
        Disabled: {
            fg: dim(normalFg),
            bg: normalBg,
        },
        Highlight: {
            fg: normalBg,
            bg: normalFg,
            italic: true,
        },
    };
}
