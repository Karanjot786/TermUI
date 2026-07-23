import { ColorDepth } from '../style/Color.js';
import { getTerminalCapabilities } from './capabilities.js';

const capsOverrides: Partial<{
  colorDepth: ColorDepth;
  color: boolean;
  unicode: boolean;
  motion: boolean;
  ci: boolean;
  background: 'light' | 'dark';
  keybindingMode: 'vim' | 'emacs' | 'default';
}> = {};

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
    if (capsOverrides.colorDepth !== undefined) return capsOverrides.colorDepth;
    return getTerminalCapabilities().color.depth;
  },
  set colorDepth(value: ColorDepth) {
    capsOverrides.colorDepth = value;
  },
  /** Whether color output is enabled. Returns false when NO_COLOR or TERM=dumb. */
  get color(): boolean {
    if (capsOverrides.color !== undefined) return capsOverrides.color;
    return getTerminalCapabilities().color.enabled;
  },
  set color(value: boolean) {
    capsOverrides.color = value;
  },
  /** Whether Unicode characters are supported. Disabled by NO_UNICODE or TERM=dumb. */
  get unicode(): boolean {
    if (capsOverrides.unicode !== undefined) return capsOverrides.unicode;
    return getTerminalCapabilities().unicode.enabled;
  },
  set unicode(value: boolean) {
    capsOverrides.unicode = value;
  },
  /** Whether animations are enabled. Disabled by NO_MOTION or CI environments. */
  get motion(): boolean {
    if (capsOverrides.motion !== undefined) return capsOverrides.motion;
    return getTerminalCapabilities().motion;
  },
  set motion(value: boolean) {
    capsOverrides.motion = value;
  },
  /** Whether running inside a CI system (CI=1). */
  get ci(): boolean {
    if (capsOverrides.ci !== undefined) return capsOverrides.ci;
    return getTerminalCapabilities().ci;
  },
  set ci(value: boolean) {
    capsOverrides.ci = value;
  },
  /** Terminal background color (light/dark). Checks TERM_BACKGROUND then COLORFGBG. */
  get background(): 'light' | 'dark' {
    if (capsOverrides.background !== undefined) return capsOverrides.background;
    return getTerminalCapabilities().background;
  },
  set background(value: 'light' | 'dark') {
    capsOverrides.background = value;
  },
  /** Keyboard navigation mode: 'default' (arrow keys), 'vim' (hjkl), or 'emacs' (C-n/p). */
  get keybindingMode(): 'vim' | 'emacs' | 'default' {
    if (capsOverrides.keybindingMode !== undefined) return capsOverrides.keybindingMode;
    return getTerminalCapabilities().keybindingMode;
  },
  set keybindingMode(value: 'vim' | 'emacs' | 'default') {
    capsOverrides.keybindingMode = value;
  },
} as const;

export function resetCapsOverridesForTests(): void {
  for (const key of Object.keys(capsOverrides) as Array<keyof typeof capsOverrides>) {
    delete capsOverrides[key];
  }
}

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
