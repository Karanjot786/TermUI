import { type KeyEvent, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '@termuijs/widgets';

export class SearchableSelect extends Widget {
  private _searchQuery: string = '';
  private _options: string[] = [];
  private _selectedIndex: number = 0;

  constructor() {
    super(mergeStyles(defaultStyle(), { height: 5 }));
  }

  public get searchQuery(): string {
    return this._searchQuery;
  }

  public get selectedOption(): string {
    return this._options[this._selectedIndex] || '';
  }

  public handleKey(event: KeyEvent): void {
    const char = event.key;
    
    if (char.length === 1 && !event.ctrl && !event.alt) {
      this._searchQuery += char;
      this._filterOptions();
      return;
    }

    if (event.key === 'backspace') {
      this._searchQuery = this._searchQuery.slice(0, -1);
      this._filterOptions();
      return;
    }

    if (event.key === 'down') {
      this.selectNext();
      return;
    }

    if (event.key === 'up') {
      this.selectPrev();
      return;
    }

    if (event.key === 'enter') {
      this.confirm();
      return;
    }
  }

  public selectNext(): void {
    if (this._selectedIndex < this._options.length - 1) {
      this._selectedIndex++;
    }
  }

  public selectPrev(): void {
    if (this._selectedIndex > 0) {
      this._selectedIndex--;
    }
  }

  public confirm(): void {
  }

  private _filterOptions(): void {
  }

  protected _renderSelf(screen: Screen): void {
    const { x, y } = this._rect;
    const pointer = caps.unicode ? '➔' : '>';
    
    screen.writeString(
      x, 
      y, 
      pointer + ' ' + this._searchQuery, 
      styleToCellAttrs(this.style)
    );
  }
}