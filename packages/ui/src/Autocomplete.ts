import { type KeyEvent, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '@termuijs/widgets';

export class Autocomplete extends Widget {
  private _query: string = '';

  constructor() {
    super(mergeStyles(defaultStyle(), { height: 5 }));
  }

  get query(): string {
    return this._query;
  }

  public handleKey(event: KeyEvent): void {
    const char = event.key;
    
    if (char.length === 1 && !event.ctrl && !event.alt) {
      this._query += char;
      return;
    }

    if (event.key === 'backspace') {
      this._query = this._query.slice(0, -1);
      return;
    }
  }

  protected _renderSelf(screen: Screen): void {
    const { x, y } = this._rect;
    const pointer = caps.unicode ? '➔' : '>';
    screen.writeString(x, y, pointer + ' ' + this._query, styleToCellAttrs(this.style));
  }
}