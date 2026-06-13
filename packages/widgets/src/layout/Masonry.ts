import { Widget } from '../base/Widget.js';
import { type Screen, type Style } from '@termuijs/core';

export interface MasonryOptions {
  /** Number of columns. Default: 2 */
  columns?: number;
  /** Vertical gap between items. Default: 0 */
  gap?: number;
}

export class Masonry extends Widget {
  private _columns: number;
  private _gap: number;

  constructor(
    children: Widget[],
    style?: Partial<Style>,
    opts?: MasonryOptions,
  ) {
    super(style);
    this._columns = opts?.columns ?? 2;
    this._gap = opts?.gap ?? 0;
    this.setChildren(children);
  }

  setChildren(children: Widget[]): void {
    this.clearChildren();
    for (const child of children) this.addChild(child);
    this._layout();
    this.markDirty();
  }

  override syncLayout(): void {
    super.syncLayout();
    this._layout();
  }

  protected _renderSelf(_screen: Screen): void {}

  private _layout(): void {
    const totalWidth = this.rect.width || 80;
    const colWidth = Math.floor(totalWidth / this._columns);
    const colHeights = new Array<number>(this._columns).fill(0);

    for (const child of this.children) {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = col * colWidth;
      const y = colHeights[col];
      // preferredHeight is a test-only property set by test helper
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const height = (child as any).preferredHeight ?? (child.rect.height || 1);

      child.updateRect({ x, y, width: colWidth, height });

      colHeights[col] += height + this._gap;
    }
  }
}