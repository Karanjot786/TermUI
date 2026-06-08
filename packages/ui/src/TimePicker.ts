import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs } from '@termuijs/core';

export interface TimePickerOptions {
    value?: Date;
    onChange?: (date: Date) => void;
    use24Hour?: boolean;
}

export class TimePicker extends Widget {
    private _date: Date;
    private _use24Hour: boolean;
    private _activeSegment: number = 0; // 0: Hours, 1: Minutes, 2: AM/PM
    private _onChange?: (date: Date) => void;
    focusable = true;

    constructor(options: TimePickerOptions = {}) {
        super(mergeStyles(defaultStyle(), { border: 'single', height: 3 }));
        this._date = options.value ? new Date(options.value) : new Date();
        this._use24Hour = options.use24Hour ?? false;
        this._onChange = options.onChange;
    }

    get value(): Date {
        return this._date;
    }

    set value(val: Date) {
        this._date = new Date(val);
        this.markDirty();
    }

    private _updateSegment(delta: number): void {
        const d = new Date(this._date);
        if (this._activeSegment === 0) {
            d.setHours(d.getHours() + delta);
        } else if (this._activeSegment === 1) {
            d.setMinutes(d.getMinutes() + delta);
        } else if (this._activeSegment === 2) {
            const h = d.getHours();
            if (h >= 12) {
                d.setHours(h - 12);
            } else {
                d.setHours(h + 12);
            }
        }
        this._date = d;
        this.markDirty();
        this._onChange?.(this._date);
    }

    private _nextSegment(delta: number): void {
        this._activeSegment += delta;
        const max = this._use24Hour ? 1 : 2;
        if (this._activeSegment < 0) this._activeSegment = 0;
        if (this._activeSegment > max) this._activeSegment = max;
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left':
            case 'h':
                this._nextSegment(-1);
                break;
            case 'right':
            case 'l':
                this._nextSegment(1);
                break;
            case 'up':
            case 'k':
                this._updateSegment(1);
                break;
            case 'down':
            case 'j':
                this._updateSegment(-1);
                break;
            case 'enter':
            case 'return':
                this._onChange?.(this._date);
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        let h = this._date.getHours();
        const m = this._date.getMinutes();
        const isPM = h >= 12;

        let ampmStr = "";
        if (!this._use24Hour) {
            if (h === 0) h = 12;
            else if (h > 12) h -= 12;
            ampmStr = isPM ? " PM" : " AM";
        }

        const hStr = String(h).padStart(2, '0');
        const mStr = String(m).padStart(2, '0');

        const totalWidth = 2 + 1 + 2 + (this._use24Hour ? 0 : 3);
        const startX = x + Math.max(0, Math.floor((width - totalWidth) / 2));
        const centerY = y + Math.floor(height / 2);

        screen.writeString(startX, centerY, hStr, {
            ...attrs,
            inverse: this.isFocused && this._activeSegment === 0
        });

        screen.writeString(startX + 2, centerY, ":", attrs);

        screen.writeString(startX + 3, centerY, mStr, {
            ...attrs,
            inverse: this.isFocused && this._activeSegment === 1
        });

        if (!this._use24Hour) {
            screen.writeString(startX + 5, centerY, ampmStr, {
                ...attrs,
                inverse: this.isFocused && this._activeSegment === 2
            });
        }
    }
}
