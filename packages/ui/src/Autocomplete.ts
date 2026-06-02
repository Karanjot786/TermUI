import { type KeyEvent, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '@termuijs/widgets';

export class Autocomplete extends Widget {
  private _query: string = '';

  constructor() {
    super(mergeStyles(defaultStyle(), { height: 5 }));
  }

  public handleKey(event: KeyEvent): void {
    if (event.key.length === 1 && !event.ctrl && !event.alt) {
      this._query += event.key;
    }
  }

  protected _renderSelf(screen: Screen): void {
    const { x, y } = this._rect;
    const pointer = caps.unicode ? '➔' : '>';
    screen.writeString(x, y, pointer + ' ' + this._query, styleToCellAttrs(this.style));
  }
}