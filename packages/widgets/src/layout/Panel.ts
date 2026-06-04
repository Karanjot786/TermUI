// ─────────────────────────────────────────────────────
// @termuijs/widgets — Panel widget
// ─────────────────────────────────────────────────────

import {
  type Screen,
  type Style,
  type Color,
  styleToCellAttrs,
  stringWidth,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface PanelOptions {
  /** Required title shown in the top border */
  title: string;
  /** Optional color for the border and title */
  borderColor?: Color;
}

/**
 * Panel — a labeled container widget.
 *
 * A Box with a required title rendered inside the top border line.
 * Use it as a labeled container for grouping related content.
 *
 * Unicode: ╭─ My Panel ──────╮
 * ASCII:   +-- My Panel -----+
 */
export class Panel extends Widget {
  private _title: string;
  private _borderColor?: Color;

  constructor(style: Partial<Style> = {}, opts: PanelOptions) {
    super({
      border: 'single',
      padding: 1,
      ...style,
    });
    this._title = opts.title;
    this._borderColor = opts.borderColor;
  }

  setTitle(title: string): void {
    this._title = title;
    this.markDirty();
  }

  protected _renderSelf(screen: Screen): void {
    const { x, y, width } = this._rect;
    if (width < 4) return;

    const attrs = styleToCellAttrs(this._style);
    const fg = this._borderColor ?? attrs.fg;

    // Title rendered into top border: ─ Title ─
    const titleText = ` ${this._title} `;
    const titleWidth = stringWidth(titleText);
    const innerWidth = width - 2; // minus corners

    if (titleWidth > innerWidth) return;

    // Place title at x+1 (after corner char)
    const titleX = x + 1;
    screen.writeString(titleX, y, titleText, { ...attrs, fg, bold: true });
  }
}
