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

export interface SliderOptions {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  color?: Color;
  showValue?: boolean;
}

export class Slider extends Widget {
  focusable = true;
  private _label: string;
  private _value = 0;
  private _min: number;
  private _max: number;
  private _step: number;
  private _color: Color;
  private _showValue: boolean;

  constructor(
    label: string,
    style: Partial<Style> = {},
    opts: SliderOptions = {}
  ) {
    super(style);

    this._label = label;
    this._min = opts.min ?? 0;
    this._max = opts.max ?? 100;
    this._step = opts.step ?? 1;
    this._color = opts.color ?? { type: "named", name: "cyan" };
    this._showValue = opts.showValue ?? true;
    this._value = Math.max(this._min, Math.min(this._max, opts.value ?? this._min));
  }

  getValue(): number {
    return this._value;
  }

  setValue(value: number): void {
    this._value = Math.max(this._min, Math.min(this._max, value));
    this.markDirty();
  }

  setLabel(label: string): void {
    this._label = label;
    this.markDirty();
  }

  handleKey(event: KeyEvent): void {
    switch (event.key) {
      case "right":
        this.setValue(this._value + this._step);
        break;
      case "left":
        this.setValue(this._value - this._step);
        break;
    }
  }

  protected _renderSelf(screen: Screen): void {
    const rect = this._getContentRect();
    const { x, y, width, height } = rect;

    if (width <= 0 || height <= 0) return;

    const attrs = styleToCellAttrs(this._style);

    const leftArrow = caps.unicode ? "◄" : "<";
    const rightArrow = caps.unicode ? "►" : ">";

    const valueStr = this._showValue ? ` ${this._value}%` : "";
    const prefix = `${this._label} ${leftArrow} `;
    const suffix = ` ${rightArrow}${valueStr}`;

    const prefixWidth = stringWidth(prefix);
    const suffixWidth = stringWidth(suffix);

    const trackWidth = Math.max(
      0,
      width - prefixWidth - suffixWidth
    );

    const ratio =
      (this._value - this._min) /
      Math.max(1, this._max - this._min);

    const filled = Math.round(trackWidth * ratio);

    screen.writeString(x, y, prefix, {
      ...attrs,
      bold: true,
    });

    const trackX = x + prefixWidth;

    for (let i = 0; i < trackWidth; i++) {
      const filledChar = caps.unicode ? "█" : "#";
      const emptyChar = caps.unicode ? "░" : "-";

      screen.setCell(trackX + i, y, {
        char: i < filled ? filledChar : emptyChar,
        fg:
          i < filled
            ? this._color
            : { type: "named", name: "brightBlack" },
      });
    }

    screen.writeString(trackX + trackWidth, y, suffix, {
      ...attrs,
      bold: true,
    });
  }
}