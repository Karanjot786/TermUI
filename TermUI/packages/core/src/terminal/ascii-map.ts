// Box-drawing unicode → ASCII fallback map
export const BOX: Record<string, string> = {
  '┌': '+', '┐': '+', '└': '+', '┘': '+',
  '─': '-', '│': '|', '├': '+', '┤': '+',
  '┬': '+', '┴': '+', '┼': '+',
  '═': '=', '║': '|', '╔': '+', '╗': '+', '╚': '+', '╝': '+',
  '╠': '+', '╣': '+', '╦': '+', '╩': '+', '╬': '+',
};

// Spinner fallback frames when unicode not available
export const BRAILLE_SPIN = ['|', '/', '-', '\\'] as const;

// Block characters for progress bars
export const BLOCK = { full: '#', empty: ' ', partial: '-' } as const;
