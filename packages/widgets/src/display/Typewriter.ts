import { Widget } from '../base/Widget.js';
import { type Screen, type Style, caps, styleToCellAttrs, stringWidth } from '@termuijs/core';

// ─────────────────────────────────────────────────────────────────────────────
// TypewriterOptions
// ─────────────────────────────────────────────────────────────────────────────

export interface TypewriterOptions {
  /** Characters revealed per tick. Must be a positive integer. Default: 1 */
  speed?: number;
  /** Cursor glyph drawn at the reveal head. Default: caps-aware block. */
  cursor?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Typewriter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reveals static text character by character.
 *
 * The host is responsible for calling `tick()` at whatever cadence it likes
 * (timer, animation loop, etc.). No internal timer is used.
 *
 * @example
 * ```ts
 * const tw = new Typewriter('hello world');
 * const interval = setInterval(() => {
 *   tw.tick();
 *   screen.render();
 * }, 80);
 * ```
 */
export class Typewriter extends Widget {
  private _text: string;
  private _revealed: number;
  private _speed: number;
  private _cursor: string | undefined;

  constructor(
    text: string,
    style: Partial<Style> = {},
    opts: TypewriterOptions = {},
  ) {
    super(style);
    this._text = text;
    this._revealed = 0;
    // Clamp speed to a positive integer: non-positive, NaN, and fractional
    // values would cause reveal to stall or behave non-deterministically.
    const raw = opts.speed ?? 1;
    this._speed = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
    // undefined means "auto from caps at render time"; a caller-supplied string
    // overrides it unconditionally.
    this._cursor = opts.cursor;
  }

  // ── Public mutating methods ────────────────────────────────────────────────

  /** Advance the reveal head by `speed` characters. No-op once fully revealed. */
  tick(): void {
    if (this._revealed >= this._text.length) return;
    this._revealed = Math.min(this._revealed + this._speed, this._text.length);
    this.markDirty();
  }

  /** Return the reveal counter to zero. */
  reset(): void {
    this._revealed = 0;
    this.markDirty();
  }

  /** Replace the text and reset the reveal counter. */
  setText(text: string): void {
    this._text = text;
    this._revealed = 0;
    this.markDirty();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  protected _renderSelf(screen: Screen): void {
    const { x, y, width, height } = this._getContentRect();
    if (width <= 0 || height <= 0) return;

    const fullyRevealed = this._revealed >= this._text.length;

    // Cursor glyph: caller-supplied string wins; otherwise caps-aware default.
    const cursorGlyph =
      this._cursor ?? (caps.unicode ? '▋' : '_');

    // Visible text slice (by code-unit index, i.e. character count).
    const visibleText = this._text.slice(0, this._revealed);

    // Append cursor when not yet fully revealed.
    const lineWithCursor = fullyRevealed
      ? visibleText
      : visibleText + cursorGlyph;

    // Truncate to the available terminal columns using display-width-aware
    // slicing so that full-width Unicode glyphs (e.g. CJK) never overflow
    // the content rect. stringWidth() counts terminal columns, not code units.
    let line = '';
    let cols = 0;
    for (const char of lineWithCursor) {
      const w = stringWidth(char);
      if (cols + w > width) break;
      line += char;
      cols += w;
    }

    const attrs = styleToCellAttrs(this._style);
    screen.writeString(x, y, line, attrs);
  }
}