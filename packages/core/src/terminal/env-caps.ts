import { ColorDepth, detectColorDepth } from '../style/Color.js';

/**
 * Terminal capability detection hub.
 *
 * Used by every package to adapt rendering to the current terminal.
 * Widget authors should check these properties before using
 * non-ASCII characters, animations, or color sequences.
 */
export const caps = {
  /** Detected color depth (None, ANSI16, ANSI256, TrueColor). */
  get colorDepth(): ColorDepth {
    return detectColorDepth();
  },
  /** Whether color output is enabled. Returns false when NO_COLOR or TERM=dumb. */
  get color(): boolean {
    if (process.env.NO_COLOR !== undefined) return false;
    if (process.env.TERM === 'dumb') return false;
    return this.colorDepth !== ColorDepth.None;
  },
  /** Whether Unicode characters are supported. Disabled by NO_UNICODE or TERM=dumb. */
  unicode: !process.env.NO_UNICODE && process.env.TERM !== 'dumb',
  /** Whether animations are enabled. Disabled by NO_MOTION or CI environments. */
  motion:  !process.env.NO_MOTION && !process.env.CI,
  /** Whether running inside a CI system (CI=1). */
  ci:      !!process.env.CI,
  /** Terminal background color (light/dark). Checks TERM_BACKGROUND then COLORFGBG. */
  get background(): 'light' | 'dark' {
    // Explicit override takes priority over terminal heuristics.
    if (process.env.TERM_BACKGROUND === 'light') return 'light';
    if (process.env.TERM_BACKGROUND === 'dark') return 'dark';

    const colorfgbg = process.env.COLORFGBG;
    if (colorfgbg) {
      const parts = colorfgbg.split(';');
      const bg = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(bg)) return bg < 8 ? 'dark' : 'light';
    }

    return 'dark';
  },
  /** Keyboard navigation mode: 'default' (arrow keys), 'vim' (hjkl), or 'emacs' (C-n/p). */
  get keybindingMode(): 'vim' | 'emacs' | 'default' {
    const mode = process.env.TERMUI_KEYBINDINGS;
    if (mode === 'vim' || mode === 'emacs') return mode;
    return 'default';
  },
} as const;

/**
 * Returns `true` when animation should be suppressed.
 *
 * True when `caps.motion` is `false` — i.e. when `NO_MOTION=1` is set
 * or when running in a CI environment (`CI=1`).
 *
 * Animated widgets **must** check this function and render their static
 * end-state (a single final frame) when it returns `true`, rather than
 * playing through intermediate animation frames.
 *
 * @example
 * if (prefersReducedMotion()) {
 *   renderStaticFrame();
 * } else {
 *   startAnimation();
 * }
 */
export function prefersReducedMotion(): boolean {
  return !caps.motion;
}

/**
 * Returns `true` when color output should be used.
 *
 * Returns `false` when `NO_COLOR=1` is set or `TERM=dumb`,
 * as per <https://no-color.org>.
 *
 * All widgets that emit ANSI color codes **must** check this function
 * and emit plain text (no escape sequences) when it returns `false`.
 *
 * @example
 * if (shouldUseColor()) {
 *   output += colorToAnsiFg(cell.fg, depth);
 * }
 */
export function shouldUseColor(): boolean {
  return caps.color;
}

/**
 * Returns `true` when the user prefers high-contrast output.
 *
 * Widgets that render text on colored backgrounds **may** check this
 * to use more distinct color combinations.
 */
export function prefersHighContrast(): boolean {
  return process.env.HIGH_CONTRAST === '1';
}
