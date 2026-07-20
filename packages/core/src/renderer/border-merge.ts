import type { Screen } from '../terminal/Screen.js';
import { caps } from '../terminal/env-caps.js';

// ── Comprehensive box-drawing character detection ──────

// All characters with a vertical stroke (raw segments, corners, junctions, round)
const VERTICAL_CHARS = new Set([
  '│', '║', '┃', '┆', '|',
  '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼',
  '╔', '╗', '╚', '╝', '╟', '╢', '╤', '╧', '╥', '╨', '╞', '╡', '╪', '╫', '╬',
  '┏', '┓', '┗', '┛', '┠', '┨', '┰', '┸', '┝', '┥', '┞', '┦', '┱', '┹', '┲', '┺', '┽', '┾', '┿',
  '+', '╭', '╮', '╰', '╯',
]);

// All characters with a horizontal stroke
const HORIZONTAL_CHARS = new Set([
  '─', '═', '━', '┄', '-',
  '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼',
  '╔', '╗', '╚', '╝', '╟', '╢', '╤', '╧', '╥', '╨', '╞', '╡', '╪', '╫', '╬',
  '┏', '┓', '┗', '┛', '┠', '┨', '┰', '┸', '┝', '┥', '┞', '┦', '┱', '┹', '┲', '┺', '┽', '┾', '┿',
  '+', '╭', '╮', '╰', '╯',
]);

function isVertical(char: string): boolean {
  return VERTICAL_CHARS.has(char);
}

function isHorizontal(char: string): boolean {
  return HORIZONTAL_CHARS.has(char);
}

// ── Border character weight classification ────────────

type BorderWeight = 'single' | 'double' | 'heavy';

// Map specific chars to their visual weight
const WEIGHT_MAP: Record<string, BorderWeight> = {
  '│': 'single', '─': 'single',
  '┌': 'single', '┐': 'single', '└': 'single', '┘': 'single',
  '├': 'single', '┤': 'single', '┬': 'single', '┴': 'single', '┼': 'single',
  '╭': 'single', '╮': 'single', '╰': 'single', '╯': 'single',
  '║': 'double', '═': 'double',
  '╔': 'double', '╗': 'double', '╚': 'double', '╝': 'double',
  '╟': 'double', '╢': 'double', '╤': 'double', '╧': 'double',
  '╥': 'double', '╨': 'double', '╞': 'double', '╡': 'double',
  '╪': 'double', '╫': 'double', '╬': 'double',
  '┃': 'heavy', '━': 'heavy',
  '┏': 'heavy', '┓': 'heavy', '┗': 'heavy', '┛': 'heavy',
  '┠': 'heavy', '┨': 'heavy', '┰': 'heavy', '┸': 'heavy',
  '┝': 'heavy', '┥': 'heavy', '┞': 'heavy', '┦': 'heavy',
  '┱': 'heavy', '┹': 'heavy', '┲': 'heavy', '┺': 'heavy',
  '┽': 'heavy', '┾': 'heavy', '┿': 'heavy',
};

// Dashed and ASCII chars are treated as light-weight for merge purposes
const DASHED_CHARS = new Set(['┆', '┄']);
const ASCII_CHARS = new Set(['|', '-', '+']);

function charWeight(char: string): BorderWeight | null {
  return WEIGHT_MAP[char] ?? null;
}

// Returns the heavier of two weights, used for mixed-style junctions.
function heavierWeight(a: BorderWeight | null, b: BorderWeight | null): BorderWeight {
  if (a === 'heavy' || b === 'heavy') return 'heavy';
  if (a === 'double' || b === 'double') return 'double';
  return 'single';
}

function isBorderChar(char: string): boolean {
  return VERTICAL_CHARS.has(char) || HORIZONTAL_CHARS.has(char) ||
         DASHED_CHARS.has(char) || ASCII_CHARS.has(char);
}

// ── Style-specific junction maps ──────────────────────

export const SINGLE_JUNCTIONS: Record<string, string> = {
  LRTB: '┼', RTB: '├', LTB: '┤', LRB: '┬', LRT: '┴',
  RB: '┌', LB: '┐', RT: '└', LT: '┘',
  TB: '│', LR: '─',
  R: '─', L: '─', T: '│', B: '│',
};

export const DOUBLE_JUNCTIONS: Record<string, string> = {
  LRTB: '╬', RTB: '╟', LTB: '╢', LRB: '╦', LRT: '╩',
  RB: '╔', LB: '╗', RT: '╚', LT: '╝',
  TB: '║', LR: '═',
  R: '═', L: '═', T: '║', B: '║',
};

export const HEAVY_JUNCTIONS: Record<string, string> = {
  LRTB: '┿', RTB: '┠', LTB: '┨', LRB: '┰', LRT: '┸',
  RB: '┏', LB: '┓', RT: '┗', LT: '┛',
  TB: '┃', LR: '━',
  R: '━', L: '━', T: '┃', B: '┃',
};

// Mixed: vertical weight is used when both axes are present but differ.
// For corners and tees the heavier style takes precedence.
const MIXED_LIGHT_VERTICAL: Record<string, string> = {
  LRTB: '│', RTB: '│', LTB: '│', LRB: '┬', LRT: '┴',
  RB: '┌', LB: '┐', RT: '└', LT: '┘',
};

export const ASCII_JUNCTIONS: Record<string, string> = {
  LRTB: '+', RTB: '+', LTB: '+', LRB: '+', LRT: '+',
  RB: '+', LB: '+', RT: '+', LT: '+',
  TB: '|', LR: '-',
  R: '-', L: '-', T: '|', B: '|',
};

// Determine the effective junction map to use based on surrounding characters.
function selectJunctions(
  hasLeft: boolean, hasRight: boolean,
  hasTop: boolean, hasBottom: boolean,
  left: string, right: string, top: string, bottom: string,
): Record<string, string> {
  // Collect horizontal chars (left/right) and vertical chars (top/bottom)
  const hChars: string[] = [];
  if (hasLeft) hChars.push(left);
  if (hasRight) hChars.push(right);
  const vChars: string[] = [];
  if (hasTop) vChars.push(top);
  if (hasBottom) vChars.push(bottom);

  // Determine horizontal and vertical weights independently
  let hWeight: BorderWeight = 'single';
  for (const c of hChars) {
    const w = charWeight(c);
    if (w === 'heavy') hWeight = 'heavy';
    else if (w === 'double' && hWeight !== 'heavy') hWeight = 'double';
  }

  let vWeight: BorderWeight = 'single';
  for (const c of vChars) {
    const w = charWeight(c);
    if (w === 'heavy') vWeight = 'heavy';
    else if (w === 'double' && vWeight !== 'heavy') vWeight = 'double';
  }

  // If both axes have the same weight, use that weight's junction set
  if (hWeight === vWeight) {
    if (hWeight === 'heavy') return HEAVY_JUNCTIONS;
    if (hWeight === 'double') return DOUBLE_JUNCTIONS;
    return SINGLE_JUNCTIONS;
  }

  // Mixed: use the heavier of the two
  const overall = heavierWeight(hWeight, vWeight);
  if (overall === 'heavy') return HEAVY_JUNCTIONS;
  if (overall === 'double') return DOUBLE_JUNCTIONS;
  return SINGLE_JUNCTIONS;
}

function getJunctions(): Record<string, string> {
  return caps.unicode ? SINGLE_JUNCTIONS : ASCII_JUNCTIONS;
}

// ── Public API ────────────────────────────────────────

/**
 * Merge adjacent box-drawing characters on a screen into correct junctions.
 *
 * Inspects each cell's neighbours and, when they form a continuous border,
 * replaces the placeholder with the appropriate corner/tee/cross glyph for
 * the detected border weight. Uses ASCII fallbacks when `caps.unicode` is off.
 * Only spaces and existing border characters are overwritten.
 */
export function mergeBorders(screen: Screen): void {
  const grid = screen.back;
  const asciiJunctions = ASCII_JUNCTIONS;

  const updates: Array<{
    row: number;
    col: number;
    char: string;
  }> = [];

  for (let row = 0; row < screen.rows; row++) {
    for (let col = 0; col < screen.cols; col++) {
      const cell = grid[row][col];

      // Content-preservation guard: only overwrite border chars or spaces
      const currentChar = cell.char;
      if (currentChar !== ' ' && !isBorderChar(currentChar)) continue;

      const top = row > 0 ? grid[row - 1][col].char : '';
      const bottom = row < screen.rows - 1 ? grid[row + 1][col].char : '';
      const left = col > 0 ? grid[row][col - 1].char : '';
      const right = col < screen.cols - 1 ? grid[row][col + 1].char : '';

      const hasTop = isVertical(top);
      const hasBottom = isVertical(bottom);
      const hasLeft = isHorizontal(left);
      const hasRight = isHorizontal(right);

      const key =
        (hasLeft ? 'L' : '') +
        (hasRight ? 'R' : '') +
        (hasTop ? 'T' : '') +
        (hasBottom ? 'B' : '');

      if (!key) continue;

      if (!caps.unicode) {
        const merged = asciiJunctions[key];
        if (merged) {
          updates.push({ row, col, char: merged });
        }
        continue;
      }

      // Unicode path: select style-appropriate junction
      const junctions = selectJunctions(hasLeft, hasRight, hasTop, hasBottom, left, right, top, bottom);
      const merged = junctions[key];
      if (merged) {
        updates.push({ row, col, char: merged });
      }
    }
  }

  for (const update of updates) {
    grid[update.row][update.col].char = update.char;
  }
}
