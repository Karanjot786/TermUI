function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
        return {
            r: parseInt(clean[0] + clean[0], 16),
            g: parseInt(clean[1] + clean[1], 16),
            b: parseInt(clean[2] + clean[2], 16),
        };
    }
    if (clean.length === 6) {
        return {
            r: parseInt(clean.slice(0, 2), 16),
            g: parseInt(clean.slice(2, 4), 16),
            b: parseInt(clean.slice(4, 6), 16),
        };
    }
    return null;
}

/** Clamp a number between 0 and 255 */
function clamp(n: number): number {
    return Math.max(0, Math.min(255, Math.round(n)));
}

/** Convert r,g,b back to hex string */
export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

/** Parse an amount — supports percentage string ("20%") or plain number (0.2) */
function parseAmount(amount: string | number): number {
    if (typeof amount === 'string' && amount.endsWith('%')) {
        return parseFloat(amount) / 100;
    }
    return typeof amount === 'string' ? parseFloat(amount) : amount;
}

/**
 * Lighten a hex color by a given amount (0–1 or "0%"–"100%").
 * Shifts each RGB channel toward 255.
 */
export function lighten(color: string, amount: string | number): string {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    const a = parseAmount(amount);
    return rgbToHex(
        rgb.r + (255 - rgb.r) * a,
        rgb.g + (255 - rgb.g) * a,
        rgb.b + (255 - rgb.b) * a,
    );
}

/**
 * Darken a hex color by a given amount (0–1 or "0%"–"100%").
 * Shifts each RGB channel toward 0.
 */
export function darken(color: string, amount: string | number): string {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    const a = parseAmount(amount);
    return rgbToHex(
        rgb.r * (1 - a),
        rgb.g * (1 - a),
        rgb.b * (1 - a),
    );
}

/**
 * Set the alpha/transparency of a hex color.
 * Returns rgba(r, g, b, alpha) string.
 */
export function alpha(color: string, amount: string | number): string {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    const a = parseAmount(amount);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

/**
 * Evaluate a color function call string like:
 *   lighten(#336699, 20%)
 *   darken(#336699, 0.2)
 *   alpha(#000000, 0.5)
 *
 * Returns the resolved color string, or the original value if not matched.
 */
export function evalColorFunction(value: string): string {
    const match = value.match(/^(lighten|darken|alpha)\(\s*(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))\s*,\s*([^)]+)\s*\)$/);
    if (!match) return value;
    const [, fn, color, amount] = match;
    if (fn === 'lighten') return lighten(color, amount.trim());
    if (fn === 'darken') return darken(color, amount.trim());
    if (fn === 'alpha') return alpha(color, amount.trim());
    return value;
}
