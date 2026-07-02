import {
  type Screen,
  type Style,
  type KeyEvent,
  styleToCellAttrs,
  caps,
} from "@termuijs/core";
import { Widget } from "../base/Widget.js";

export interface PinInputOptions {
  length?: number;
  masked?: boolean;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
}

export class PinInput extends Widget {
  private _length: number;
  private _masked: boolean;
  private _value: string[];
  private _cursorPos: number = 0;
  private _onChange?: (value: string) => void;
  private _onComplete?: (value: string) => void;

  /**
   * Creates a new PinInput widget.
   *
   * @param style Partial style properties for the widget.
   * @param opts Configuration options for the PinInput.
   */
  constructor(
    style: Partial<Style> = {},
    opts: PinInputOptions = {}
  ) {
    super(style);
    this.focusable = true;

    this._length = Math.max(1, Math.floor(opts.length ?? 4));
    this._masked = opts.masked ?? false;
    this._onChange = opts.onChange;
    this._onComplete = opts.onComplete;
    
    // Initialize empty array of correct length
    this._value = Array(this._length).fill("");
  }

  get value(): string {
    return this._value.join("");
  }

  private get _isFull(): boolean {
    return this._value.every((v) => v !== "");
  }

  handleKey(event: KeyEvent): void {
    const key = event.key;

    if (key === "left") {
      this._cursorPos = Math.max(0, this._cursorPos - 1);
      this.markDirty();
      return;
    }

    if (key === "right") {
      this._cursorPos = Math.min(this._length - 1, this._cursorPos + 1);
      this.markDirty();
      return;
    }

    if (key === "backspace" || key === "delete") {
      if (this._value[this._cursorPos] !== "") {
        // Clear current block
        this._value[this._cursorPos] = "";
      } else if (this._cursorPos > 0) {
        // Move back and clear
        this._cursorPos--;
        this._value[this._cursorPos] = "";
      }
      
      this.markDirty();
      this._onChange?.(this.value);
      return;
    }

    // Handle character input
    if (key.length === 1) {
      // Set value at current position
      this._value[this._cursorPos] = key;
      this.markDirty();
      
      const currentVal = this.value;
      this._onChange?.(currentVal);

      // Advance cursor or trigger complete
        this._cursorPos = Math.min(this._length - 1, this._cursorPos + 1);
        
        if (this._isFull) {
          this._onComplete?.(this.value);
        }
    }
  }

  protected _renderSelf(screen: Screen): void {
    const rect = this._getContentRect();
    const { x, y, width, height } = rect;

    if (width <= 0 || height <= 0) return;

    const attrs = styleToCellAttrs(this._style);

    let currentX = x;

    for (let i = 0; i < this._length; i++) {
      // Check if this block would render out of bounds
      if (currentX + 5 > x + width) {
          break; // Stop rendering if it exceeds width
      }

      const isFocusedBlock = this.isFocused && this._cursorPos === i;
      const charVal = this._value[i];
      let displayChar = " ";

      if (charVal !== "") {
          displayChar = this._masked ? (caps.unicode ? "•" : "*") : charVal;
      }

        const blockStr = `[ ${displayChar} ]`;

      // Apply inverse colors for the focused block
      const blockAttrs = {
        ...attrs,
        inverse: isFocusedBlock ? !attrs.inverse : attrs.inverse,
      };

      screen.writeString(currentX, y, blockStr, blockAttrs);
      currentX += 5; // [ + space + char + space + ] -> 5 columns. We space them out.
      
      // Add gap between blocks
      currentX += 1;
    }
  }
}
