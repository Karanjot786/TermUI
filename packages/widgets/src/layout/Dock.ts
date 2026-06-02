import type { Screen, Style, Rect } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type DockEdge = 'top' | 'right' | 'bottom' | 'left' | 'fill';

export interface DockItem {
  widget: Widget;
  edge: DockEdge;
  size?: number;
}

export interface DockOptions {
  style?: Partial<Style>;
}

export class Dock extends Widget {
  private _items: DockItem[];

  constructor(items: DockItem[], style: Partial<Style> = {}) {
    super(style);
    this._items = items;
    for (const { widget } of items) {
      widget.parent = this;
    }
  }

  setItems(items: DockItem[]): void {
    this._items = items;
    for (const { widget } of items) {
      widget.parent = this;
    }
    this.markDirty();
  }

  override updateRect(rect: Rect): void {
    super.updateRect(rect);

    let top = rect.y;
    let bottom = rect.y + rect.height;
    let left = rect.x;
    let right = rect.x + rect.width;

    for (const { widget, edge, size } of this._items) {
      if (edge === 'top') {
        const h = size ?? 1;
        widget.updateRect({ x: left, y: top, width: right - left, height: h });
        top += h;
      } else if (edge === 'bottom') {
        const h = size ?? 1;
        bottom -= h;
        widget.updateRect({ x: left, y: bottom, width: right - left, height: h });
      } else if (edge === 'left') {
        const w = size ?? 1;
        widget.updateRect({ x: left, y: top, width: w, height: bottom - top });
        left += w;
      } else if (edge === 'right') {
        const w = size ?? 1;
        right -= w;
        widget.updateRect({ x: right, y: top, width: w, height: bottom - top });
      } else if (edge === 'fill') {
        widget.updateRect({ x: left, y: top, width: right - left, height: bottom - top });
      }
    }
  }

  protected _renderSelf(_screen: Screen): void {
    // Pure layout container — no self-rendering needed.
  }

  override render(screen: Screen): void {
    super.render(screen);
    for (const { widget } of this._items) {
      widget.render(screen);
    }
  }
}
