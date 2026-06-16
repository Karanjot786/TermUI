import {
  type Screen,
  type Style,
  type Color,
  type KeyEvent,
  styleToCellAttrs,
  caps,
  stringWidth,
} from "@termuijs/core";
import { Widget } from "../base/Widget.js";

export interface KnobOptions {
  min?: number;
  max?: number;
  step?: number;
  color?: Color;
  showValue?: boolean;
  onChange?: (value: number) => void;
}

export class Knob extends Widget {
  private _label: string;
  private _value: number;
  private _min: number;
  private _max: number;
  private _step: number;
  private _color: Color;
  private _showValue: boolean;
  private _onChange?: (value: number) => void;

  constructor(
    label?: string,
    style: Partial<Style> = {},
    opts: KnobOptions = {}
  ) {
    super(style);

    this.focusable = true;
    this._label = label ?? "";
    this._min = opts.min ?? 0;
    
    // Validate max to ensure min <= max
    const maxVal = opts.max ?? 100;
    this._max = maxVal >= this._min ? maxVal : this._min;
    
    this._value = this._min;
    
    // Validate step to ensure it is positive
    const stepVal = opts.step ?? 1;
    this._step = stepVal > 0 ? stepVal : 1;
    
    this._color = opts.color ?? { type: "named", name: "cyan" };
    this._showValue = opts.showValue ?? true;
    this._onChange = opts.onChange;
  }

  get value(): number {
    return this._value;
  }

  setValue(value: number): void {
    const clamped = Math.max(this._min, Math.min(this._max, value));
    if (this._value === clamped) return;

    this._value = clamped;
    this.markDirty();
    this._onChange?.(this._value);
  }

  handleKey(event: KeyEvent): void {
    switch (event.key) {
      case "up":
      case "right":
        this.setValue(this._value + this._step);
        break;
      case "down":
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

    const cx = (width - 1) / 2;
    const cy = (height - 1) / 2;
    // Account for character aspect ratio (roughly 1:2)
    const radiusX = Math.max(1, (width - 1) / 2);
    const radiusY = Math.max(1, (height - 1) / 2);
    
    // We want the arc to sweep from bottom-left (-135 deg or ~235 deg) 
    // to bottom-right (135 deg or ~305 deg). 
    // In polar coordinates with Y pointing down (terminal grids):
    // 0 rad is pointing right (3 o'clock).
    // Math.PI/2 is pointing down (6 o'clock).
    // We'll define startAngle = 135 deg (3/4 PI)
    // and endAngle = 45 deg (1/4 PI) BUT looping clockwise.
    // Meaning it spans from 135 deg -> 180 -> 270(up) -> 0 -> 45 deg.
    // Total sweep is 270 degrees.
    const sweepRange = 270;
    
    const rangeSize = Math.max(1, this._max - this._min);
    const ratio = (this._value - this._min) / rangeSize;
    const filledSweepDegrees = ratio * sweepRange;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        // Normalize dx, dy to a pure circle
        const dx = (col - cx) / radiusX;
        const dy = (row - cy) / radiusY;
        
        // Distance from center in normalized space
        const r = Math.sqrt(dx * dx + dy * dy);
        
        // We only draw if it's on the edge of the circle (thickness ~0.2)
        if (r < 0.8 || r > 1.2) {
          continue;
        }

        // Calculate angle. atan2(dy, dx) returns angle from -PI to PI.
        // Convert to degrees 0-360 starting from 3 o'clock clockwise.
        let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angleDeg < 0) {
          angleDeg += 360;
        }

        // We shift the angle so 0 starts at bottom-left (135 deg original)
        // 135 becomes 0.
        // 270(up) becomes 135.
        // 0(right) becomes 225.
        // 45(bottom-right) becomes 270.
        let shiftedAngle = angleDeg - 135;
        if (shiftedAngle < 0) {
          shiftedAngle += 360;
        }

        // If it falls in the "gap" at the bottom (between 270 and 360 in shifted coordinates)
        if (shiftedAngle > sweepRange) {
          continue;
        }

        const isFilled = shiftedAngle <= filledSweepDegrees;
        const charToRender = caps.unicode ? "█" : "#";

        screen.setCell(x + col, y + row, {
          ...attrs,
          char: charToRender,
          fg: isFilled 
            ? (this.isFocused ? { type: "named", name: "white" } : this._color)
            : { type: "named", name: "brightBlack" },
        });
      }
    }

    if (this._showValue) {
      const valStr = String(this._value);
      const valWidth = stringWidth(valStr);
      const valX = x + Math.floor((width - valWidth) / 2);
      const valY = y + Math.floor(height / 2);

      // Print in center, but only if it fits inside the circle
      // We assume it fits if the width/height are reasonable (>4)
      if (width >= 4 && height >= 3) {
        screen.writeString(valX, valY, valStr, {
          ...attrs,
          bold: true,
          fg: this.isFocused ? { type: "named", name: "white" } : this._color
        });
      }
    }
  }
}
