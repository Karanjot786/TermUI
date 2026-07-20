// ─────────────────────────────────────────────────────
// @termuijs/core — Unicode Symbol Sets
// ─────────────────────────────────────────────────────

// ── Border Sets ──────────────────────────────────────

export interface BorderSet {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    horizontal: string;
    vertical: string;
    cross: string;
}

export const BorderSets = {
    PLAIN: {
        topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
        horizontal: '─', vertical: '│', cross: '┼',
    },
    ROUNDED: {
        topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯',
        horizontal: '─', vertical: '│', cross: '┼',
    },
    DOUBLE: {
        topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝',
        horizontal: '═', vertical: '║', cross: '╬',
    },
    THICK: {
        topLeft: '┏', topRight: '┓', bottomLeft: '┗', bottomRight: '┛',
        horizontal: '━', vertical: '┃', cross: '╋',
    },
    QUADRANT_INSIDE: {
        topLeft: '▗', topRight: '▖', bottomLeft: '▝', bottomRight: '▘',
        horizontal: '▀', vertical: '▐', cross: '█',
    },
    QUADRANT_OUTSIDE: {
        topLeft: '▛', topRight: '▜', bottomLeft: '▙', bottomRight: '▟',
        horizontal: '▀', vertical: '▌', cross: '█',
    },
    EMPTY: {
        topLeft: ' ', topRight: ' ', bottomLeft: ' ', bottomRight: ' ',
        horizontal: ' ', vertical: ' ', cross: ' ',
    },
} as const satisfies Record<string, BorderSet>;

// ── Bar Chart Symbol Sets ────────────────────────────

export interface BarSet {
    full: string;
    sevenEighths: string;
    threeQuarters: string;
    fiveEighths: string;
    half: string;
    threeEighths: string;
    oneQuarter: string;
    oneEighth: string;
    empty: string;
}

/**
 * Vertical bar symbols: bottom-up block characters ▁▂▃▄▅▆▇█
 * 9 levels (including empty) for sub-cell precision.
 */
export const BarSets = {
    NINE_LEVELS: {
        full: '█', sevenEighths: '▇', threeQuarters: '▆', fiveEighths: '▅',
        half: '▄', threeEighths: '▃', oneQuarter: '▂', oneEighth: '▁', empty: ' ',
    },
    THREE_LEVELS: {
        full: '█', sevenEighths: '░', threeQuarters: '░', fiveEighths: '░',
        half: '▄', threeEighths: '░', oneQuarter: '░', oneEighth: '░', empty: ' ',
    },
    ASCII: {
        full: '#', sevenEighths: '#', threeQuarters: '#', fiveEighths: '#',
        half: '#', threeEighths: '-', oneQuarter: '-', oneEighth: '-', empty: ' ',
    },
} as const satisfies Record<string, BarSet>;

/** Ordered vertical bar symbols from empty to full (9 levels). */
export const VERTICAL_BAR_SYMBOLS: readonly string[] = [
    ' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█',
];

/** Ordered horizontal bar symbols from empty to full (9 levels). */
export const HORIZONTAL_BAR_SYMBOLS: readonly string[] = [
    ' ', '\u258F', '\u258E', '\u258D', '\u258C', '\u258B', '\u258A', '\u2589', '\u2588',
];

// ── Scrollbar Symbol Sets ────────────────────────────

export interface ScrollbarSet {
    track: string;
    thumb: string;
    begin: string;
    end: string;
}

export const ScrollbarSets = {
    VERTICAL: { track: '│', thumb: '█', begin: '↑', end: '↓' },
    HORIZONTAL: { track: '─', thumb: '█', begin: '←', end: '→' },
    DOUBLE_VERTICAL: { track: '║', thumb: '▐', begin: '▲', end: '▼' },
    DOUBLE_HORIZONTAL: { track: '═', thumb: '▌', begin: '◄', end: '►' },
} as const satisfies Record<string, ScrollbarSet>;

// ── Line Symbol Sets ─────────────────────────────────

export interface LineSet {
    horizontal: string;
    vertical: string;
    cross: string;
}

export const LineSets = {
    NORMAL: { horizontal: '─', vertical: '│', cross: '┼' },
    THICK: { horizontal: '━', vertical: '┃', cross: '╋' },
    DOUBLE: { horizontal: '═', vertical: '║', cross: '╬' },
} as const satisfies Record<string, LineSet>;

// ── Shade Symbols ────────────────────────────────────

export const Shade = {
    FULL: '█',
    DARK: '▓',
    MEDIUM: '▒',
    LIGHT: '░',
    EMPTY: ' ',
} as const;

// ── Braille Constants ────────────────────────────────

/** Unicode braille range offset (U+2800). */
export const BRAILLE_OFFSET = 0x2800;

/**
 * Braille dot bit positions.
 * Each row is [leftBit, rightBit] for a 2-wide, 4-tall braille cell.
 */
export const BRAILLE_DOTS: readonly (readonly [number, number])[] = [
    [0x01, 0x08],
    [0x02, 0x10],
    [0x04, 0x20],
    [0x40, 0x80],
] as const;
