// ─────────────────────────────────────────────────────
// @termuijs/widgets — Clock widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { Digits } from './Digits.js';

export interface ClockOptions {
    showSeconds?: boolean;
    use24Hour?: boolean;
    digitColor?: Color;
}

export class Clock extends Widget {
    private _showSeconds: boolean;
    private _use24Hour: boolean;
    private _digits: Digits;
    private _digitColor: Color;
    private _ampm: string = '';
    private _digitPartLength: number = 0;

    constructor(style: Partial<Style> = {}, opts: ClockOptions = {}) {
        super(style);
        this._showSeconds = opts.showSeconds ?? true;
        this._use24Hour = opts.use24Hour ?? true;
        this._digitColor = opts.digitColor ?? { type: 'named', name: 'white' };

        // Strip layout and border styles from style passed to Digits
        const { border, padding, margin, width, height, ...digitsStyle } = style;
        this._digits = new Digits(digitsStyle, { color: this._digitColor });

        // Initialize with current time
        this.setTime(new Date());
    }

    setTime(time: Date): void {
        const hours = time.getHours();
        const minutes = time.getMinutes();
        const seconds = time.getSeconds();

        const minStr = String(minutes).padStart(2, '0');
        const secStr = String(seconds).padStart(2, '0');

        let digitPart: string;
        let ampmPart: string = '';

        if (this._use24Hour) {
            const hourStr = String(hours).padStart(2, '0');
            digitPart = this._showSeconds 
                ? `${hourStr}:${minStr}:${secStr}` 
                : `${hourStr}:${minStr}`;
        } else {
            ampmPart = hours >= 12 ? 'PM' : 'AM';
            const displayHour = hours % 12 === 0 ? 12 : hours % 12;
            const hourStr = String(displayHour);
            digitPart = this._showSeconds 
                ? `${hourStr}:${minStr}:${secStr}` 
                : `${hourStr}:${minStr}`;
        }

        this._digits.setValue(digitPart);
        this._ampm = ampmPart;
        this._digitPartLength = digitPart.length;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        // Position and render the internal digits widget
        this._digits.updateRect(rect);
        this._digits.render(screen);

        // If in 12h mode, render AM/PM text separately
        if (this._ampm) {
            const digitsWidth = this._digitPartLength * 5; // each digit consumes 5 columns

            if (digitsWidth + this._ampm.length <= width && height >= 3) {
                const attrs = styleToCellAttrs(this._style);
                screen.writeString(x + digitsWidth, y + 2, this._ampm, { ...attrs, fg: this._digitColor });
            }
        }
    }
}
