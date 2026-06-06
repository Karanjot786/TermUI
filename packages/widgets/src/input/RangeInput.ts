import {
  type Screen,
  type Style,
  type Color,
  type KeyEvent,
  styleToCellAttrs,
  stringWidth,
  caps,
} from "@termuijs/core";
import { Widget } from "../base/Widget.js";

export interface RangeInputOptions {
  min?: number;
  max?: number;
  step?: number;
  color?: Color;
  showValue?: boolean;
}

export class RangeInput extends Widget {
  private _label: string;
  private _value: [number, number] = [0, 100];
  private _activeThumb: 0 | 1 = 0;
  private _min: number;
  private _max: number;
  private _step: number;
  private _color: Color;
  private _showValue: boolean;

  constructor(
    label?: string,
    style: Partial<Style> = {},
    opts: RangeInputOptions = {}
  ) {
    super(style);

    this._label = label ?? "";
    this._min = opts.min ?? 0;
    this._max = opts.max ?? 100;
    this._value = [this._min, this._max];
    this._step = opts.step ?? 1;
    this._color = opts.color ?? { type: "named", name: "cyan" };
    this._showValue = opts.showValue ?? true;
  }

  getValue(): [number, number] {
    return [this._value[0], this._value[1]];
  }

  setValue(value: [number, number]): void {
    let lower = Math.max(this._min, Math.min(this._max, value[0]));
    let upper = Math.max(this._min, Math.min(this._max, value[1]));

    if (lower > upper) {
        // Enforce lower <= upper
        lower = upper;
    }

    this._value = [lower, upper];
    this.markDirty();
  }

  setLabel(label: string): void {
    this._label = label;
    this.markDirty();
  }

  handleKey(event: KeyEvent): void {
    switch (event.key) {
      case "tab":
        this._activeThumb = this._activeThumb === 0 ? 1 : 0;
        this.markDirty();
        break;
      case "right": {
        const newValue: [number, number] = [this._value[0], this._value[1]];
        newValue[this._activeThumb] += this._step;
        
        // Prevent active thumb from crossing the other
        if (this._activeThumb === 0 && newValue[0] > newValue[1]) {
            newValue[0] = newValue[1];
        } else if (this._activeThumb === 1 && newValue[1] > this._max) {
            newValue[1] = this._max;
        }

        this.setValue(newValue);
        break;
      }
      case "left": {
        const newValue: [number, number] = [this._value[0], this._value[1]];
        newValue[this._activeThumb] -= this._step;
        
        // Prevent active thumb from crossing the other
        if (this._activeThumb === 1 && newValue[1] < newValue[0]) {
            newValue[1] = newValue[0];
        } else if (this._activeThumb === 0 && newValue[0] < this._min) {
            newValue[0] = this._min;
        }

        this.setValue(newValue);
        break;
      }
    }
  }

  protected _renderSelf(screen: Screen): void {
    const rect = this._getContentRect();
    const { x, y, width, height } = rect;

    if (width <= 0 || height <= 0) return;

    const attrs = styleToCellAttrs(this._style);

    const leftArrow = caps.unicode ? "◄" : "<";
    const rightArrow = caps.unicode ? "►" : ">";

    const activeIndicator = this._activeThumb === 0 ? leftArrow : rightArrow;
    
    const valueStr = this._showValue ? ` [${this._value[0]}, ${this._value[1]}]` : "";
    const prefix = `${this._label} ${activeIndicator} `;
    const suffix = `${valueStr}`;

    const prefixWidth = stringWidth(prefix);
    const suffixWidth = stringWidth(suffix);

    const trackWidth = Math.max(
      0,
      width - prefixWidth - suffixWidth
    );

    const rangeSize = Math.max(1, this._max - this._min);
    
    const ratioStart = (this._value[0] - this._min) / rangeSize;
    const ratioEnd = (this._value[1] - this._min) / rangeSize;

    const trackStart = Math.round(trackWidth * ratioStart);
    const trackEnd = Math.round(trackWidth * ratioEnd);

    screen.writeString(x, y, prefix, {
      ...attrs,
      bold: true,
      fg: this._color // Highlight prefix to show it's active
    });

    const trackX = x + prefixWidth;

    for (let i = 0; i < trackWidth; i++) {
      const isFilled = i >= trackStart && i <= trackEnd;
      const isThumb = i === trackStart || i === trackEnd;
      const isActiveThumb = (this._activeThumb === 0 && i === trackStart) || (this._activeThumb === 1 && i === trackEnd);

      const filledChar = caps.unicode ? "█" : "#";
      const emptyChar = caps.unicode ? "░" : "-";
      
      let charToRender = isFilled ? filledChar : emptyChar;
      
      if (isThumb) {
          charToRender = caps.unicode ? "█" : "O"; // Thumbs are always distinct
      }

      screen.setCell(trackX + i, y, {
        char: charToRender,
        fg: isFilled
              ? (isActiveThumb ? { type: "named", name: "white" } : this._color)
              : { type: "named", name: "brightBlack" },
      });
    }

    screen.writeString(trackX + trackWidth, y, suffix, {
      ...attrs,
      bold: true,
    });
  }
}
