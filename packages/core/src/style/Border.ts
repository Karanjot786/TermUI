// ─────────────────────────────────────────────────────
// @termuijs/core — Border styles and rendering
// ─────────────────────────────────────────────────────

/**
 * Supported border styles.
 */
export type BorderStyle =
    | 'none'
    | 'single'
    | 'double'
    | 'round'
    | 'heavy'
    | 'dashed'
    | 'custom';

/**
 * The characters used to draw a border.
 * Layout:
 * ```
 *  topLeft ─── top ─── topRight
 *    │                    │
 *   left     content    right
 *    │                    │
 *  bottomLeft ─ bottom ─ bottomRight
 * ```
 */
export interface BorderChars {
    topLeft: string;
    top: string;
    topRight: string;
    right: string;
    bottomRight: string;
    bottom: string;
    bottomLeft: string;
    left: string;
}

/** Character maps for each border style */
export const BORDER_CHARS: Record<Exclude<BorderStyle, 'none' | 'custom'>, BorderChars> = {
    single: {
        topLeft: '┌', top: '─', topRight: '┐',
        right: '│', bottomRight: '┘', bottom: '─',
        bottomLeft: '└', left: '│',
    },
    double: {
        topLeft: '╔', top: '═', topRight: '╗',
        right: '║', bottomRight: '╝', bottom: '═',
        bottomLeft: '╚', left: '║',
    },
    round: {
        topLeft: '╭', top: '─', topRight: '╮',
        right: '│', bottomRight: '╯', bottom: '─',
        bottomLeft: '╰', left: '│',
    },
    heavy: {
        topLeft: '┏', top: '━', topRight: '┓',
        right: '┃', bottomRight: '┛', bottom: '━',
        bottomLeft: '┗', left: '┃',
    },
    dashed: {
        topLeft: '┌', top: '┄', topRight: '┐',
        right: '┆', bottomRight: '┘', bottom: '┄',
        bottomLeft: '└', left: '┆',
    },
};

export const ASCII_BORDER_CHARS: BorderChars = {
    topLeft: '+',
    top: '-',
    topRight: '+',
    right: '|',
    bottomRight: '+',
    bottom: '-',
    bottomLeft: '+',
    left: '|',
};

/**
 * Get the border characters for a given style.
 */
export function getBorderChars(
    style: BorderStyle,
    customChars?: Partial<BorderChars>,
    asciiOnly = false,
): BorderChars | null {

    if (style === 'none') return null;

    if (asciiOnly) return ASCII_BORDER_CHARS;

    if (style === 'custom') {
        const base = BORDER_CHARS.single;
        return { ...base, ...customChars };
    }

    return BORDER_CHARS[style];
}

/**
 * Calculate the total space a border takes up.
 * Returns { horizontal, vertical } representing how many columns/rows
 * the border consumes (0 for none, 2 for any visible border — 1 on each side).
 */
export function borderSize(style: BorderStyle): { horizontal: number; vertical: number } {
    if (style === 'none') return { horizontal: 0, vertical: 0 };
    return { horizontal: 2, vertical: 2 };
}
