/**
 * Box-drawing character set (corners/edges/junctions) for unicode and ASCII
 * fallback. Exported for consumers that build their own borders.
 */
export const BOX: Record<string, string> = {
  '┌': '+', '┐': '+', '└': '+', '┘': '+',
  '─': '-', '│': '|', '├': '+', '┤': '+',
  '┬': '+', '┴': '+', '┼': '+',
  '═': '=', '║': '|', '╔': '+', '╗': '+', '╚': '+', '╝': '+',
  '╠': '+', '╣': '+', '╦': '+', '╩': '+', '╬': '+',
};

/**
 * Spinner fallback frames used when unicode glyphs are unavailable.
 */
export const BRAILLE_SPIN = ['|', '/', '-', '\\'] as const;

/**
 * Block characters for rendering progress bars without unicode support.
 */
export const BLOCK = { full: '#', empty: ' ', partial: '-' } as const;
