import { ColorDepth } from '../style/Color.js';
import { getTerminalCapabilities } from './capabilities.js';

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
    return getTerminalCapabilities().color.depth;
  },
  /** Whether color output is enabled. Returns false when NO_COLOR or TERM=dumb. */
  get color(): boolean {
    return getTerminalCapabilities().color.enabled;
  },
  /** Whether Unicode characters are supported. Disabled by NO_UNICODE or TERM=dumb. */
  get unicode(): boolean {
    return getTerminalCapabilities().unicode.enabled;
  },
  /** Whether animations are enabled. Disabled by NO_MOTION or CI environments. */
  get motion(): boolean {
    return getTerminalCapabilities().motion;
  },
  /** Whether running inside a CI system (CI=1). */
  get ci(): boolean {
    return getTerminalCapabilities().ci;
  },
  /** Terminal background color (light/dark). Checks TERM_BACKGROUND then COLORFGBG. */
  get background(): 'light' | 'dark' {
    return getTerminalCapabilities().background;
  },
  /** Keyboard navigation mode: 'default' (arrow keys), 'vim' (hjkl), or 'emacs' (C-n/p). */
  get keybindingMode(): 'vim' | 'emacs' | 'default' {
    return getTerminalCapabilities().keybindingMode;
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
