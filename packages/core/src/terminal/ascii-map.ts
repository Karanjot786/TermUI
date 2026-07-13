/**
 * Unicode box-drawing characters mapped to their ASCII fallbacks, used when
 * `caps.unicode` is disabled so layouts still render on plain terminals.
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
