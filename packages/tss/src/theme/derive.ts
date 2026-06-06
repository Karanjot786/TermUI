import { parseColor, colorToRgb } from '@termuijs/core';

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
    Highlight: { fg: string; italic: true };
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6})$/;

function toHex(color: string): string {
    // Fast-path: normalize simple hex forms
    if (typeof color === 'string') {
        const s = color.trim().toLowerCase();
        if (s === 'white') return '#ffffff';
        if (s === 'black') return '#000000';
        // 3-digit hex -> expand
        const m = s.match(/^#([0-9a-f]{3})$/i);
        if (m) {
            const [r, g, b] = m[1].split('');
            return `#${r}${r}${g}${g}${b}${b}`;
        }
    }

    const parsed = parseColor(color);
    if (parsed.type === 'none') {
        throw new Error(`Invalid color: ${color}`);
    }

    const [r, g, b] = colorToRgb(parsed);
    return rgbToHex(r, g, b);
}

function rgbToHex(r: number, g: number, b: number): string {
    return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function toHexByte(value: number): string {
    const clamped = Math.min(255, Math.max(0, Math.round(value)));
    return clamped.toString(16).padStart(2, '0');
}

function brighten(color: string, amount = 0.15): string {
    const [r, g, b] = colorToRgb(parseColor(color));
    const roundHalfDown = (v: number) => Math.floor(v + 0.5 - 1e-8);
    return rgbToHex(
        roundHalfDown(r + (255 - r) * amount),
        roundHalfDown(g + (255 - g) * amount),
        roundHalfDown(b + (255 - b) * amount)
    );
}

function dim(color: string, factor = 0.3): string {
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
            italic: true,
        },
    };
}
