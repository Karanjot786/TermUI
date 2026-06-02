import { Widget } from '../base/Widget.js';
import { type Style } from '@termuijs/core';

export interface MasonryOptions {
  /** Number of columns. Default: 2 */
  columns?: number;
  /** Vertical gap between items. Default: 0 */
  gap?: number;
}

export class Masonry extends Widget {
  protected _children: Widget[];
  private _columns: number;
  private _gap: number;

  constructor(
    children: Widget[],
    style?: Partial<Style>,
    opts?: MasonryOptions
  ) {
    super(style);
    this._columns = opts?.columns ?? 2;
    this._gap = opts?.gap ?? 0;
    this._children = [];
    this.setChildren(children);
  }

  setChildren(children: Widget[]): void {
    this._children = children;
    this._layout();
    this.markDirty();
  }

  protected _renderSelf(): string {
    return '';
  }

  private _layout(): void {
    const totalWidth = this.rect?.width ?? 80;
    const colWidth = Math.floor(totalWidth / this._columns);
    const colHeights = new Array<number>(this._columns).fill(0);

    for (const child of this._children) {
      // Find the shortest column
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = col * colWidth;
      const y = colHeights[col];
      const height = child.rect?.height ?? 1;

      // Use child's setRect if available; otherwise fall back to any-assignment
      if (typeof (child as any).setRect === 'function') {
        (child as any).setRect({ x, y, width: colWidth, height });
      } else {
        (child as any).rect = { x, y, width: colWidth, height };
      }

      // Advance that column's height
      colHeights[col] += height + this._gap;
    }
  }
}