// DatePicker — calendar date selector widget
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface DatePickerOptions {
    value?: Date;
    onChange?: (date: Date) => void;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export class DatePicker extends Widget {
    private _selectedDate: Date;
    private _currentMonth: Date;
    private _onChange?: (date: Date) => void;
    focusable = true;

    constructor(options: DatePickerOptions = {}) {
        super(mergeStyles(defaultStyle(), { border: 'single', height: 10 }));
        this._selectedDate = options.value ? new Date(options.value) : new Date();
        this._selectedDate.setHours(0, 0, 0, 0);

        this._currentMonth = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), 1);
        this._onChange = options.onChange;
    }

    get value(): Date {
        return this._selectedDate;
    }

    set value(date: Date) {
        this._selectedDate = new Date(date);
        this._selectedDate.setHours(0, 0, 0, 0);
        this._currentMonth = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), 1);
        this.markDirty();
    }

    moveSelection(days: number): void {
        const newDate = new Date(this._selectedDate);
        newDate.setDate(newDate.getDate() + days);
        this._selectedDate = newDate;

        if (newDate.getMonth() !== this._currentMonth.getMonth() || newDate.getFullYear() !== this._currentMonth.getFullYear()) {
            this._currentMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        }
        this.markDirty();
    }

    changeMonth(months: number): void {
        const targetMonth = this._selectedDate.getMonth() + months;
        const targetYear = this._selectedDate.getFullYear();
        const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
        const clampedDay = Math.min(this._selectedDate.getDate(), lastDayOfTarget);
        const newDate = new Date(targetYear, targetMonth, clampedDay);
        this._selectedDate = newDate;
        this._currentMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        this.markDirty();
    }

    confirm(): void {
        this._onChange?.(this._selectedDate);
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left':
            case 'h':
                if (event.key === 'left' || (!event.ctrl && !event.alt)) {
                    this.moveSelection(-1);
                }
                break;
            case 'right':
            case 'l':
                if (event.key === 'right' || (!event.ctrl && !event.alt)) {
                    this.moveSelection(1);
                }
                break;
            case 'up':
            case 'k':
                if (event.key === 'up' || (!event.ctrl && !event.alt)) {
                    this.moveSelection(-7);
                }
                break;
            case 'down':
            case 'j':
                if (event.key === 'down' || (!event.ctrl && !event.alt)) {
                    this.moveSelection(7);
                }
                break;
            case 'pageup':
                this.changeMonth(-1);
                break;
            case 'pagedown':
                this.changeMonth(1);
                break;
            case 'enter':
            case 'return':
                this.confirm();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // 1. Render Month Header (◀ Month Year ▶)
        const prevArrow = caps.unicode ? '◀' : '<';
        const nextArrow = caps.unicode ? '▶' : '>';
        const monthName = MONTH_NAMES[this._currentMonth.getMonth()];
        const year = this._currentMonth.getFullYear();
        const title = `${prevArrow} ${monthName} ${year} ${nextArrow}`;
        const titleX = x + Math.floor((width - title.length) / 2);
        screen.writeString(Math.max(x, titleX), y, title, { ...attrs, bold: true });

        if (height < 2) return;

        // 2. Render Weekdays Header
        const weekdays = 'Su Mo Tu We Th Fr Sa';
        const weekdayX = x + Math.floor((width - weekdays.length) / 2);
        screen.writeString(Math.max(x, weekdayX), y + 1, weekdays, { ...attrs, dim: true });

        // 3. Render Calendar Grid (Days)
        const daysInMonth = new Date(year, this._currentMonth.getMonth() + 1, 0).getDate();
        const firstDay = new Date(year, this._currentMonth.getMonth(), 1).getDay();

        const gridStartY = y + 2;
        const maxWeeks = 6;

        for (let w = 0; w < maxWeeks; w++) {
            const rowY = gridStartY + w;
            if (rowY >= y + height) break;

            for (let d = 0; d < 7; d++) {
                const colX = Math.max(x, weekdayX) + d * 3;
                if (colX >= x + width) continue;

                const dayVal = w * 7 + d - firstDay + 1;

                if (dayVal >= 1 && dayVal <= daysInMonth) {
                    const label = String(dayVal).padStart(2, ' ');
                    const isSelected = this._selectedDate.getDate() === dayVal &&
                        this._selectedDate.getMonth() === this._currentMonth.getMonth() &&
                        this._selectedDate.getFullYear() === this._currentMonth.getFullYear();

                    if (isSelected) {
                        screen.writeString(colX, rowY, label, {
                            ...attrs,
                            bold: true,
                            inverse: this.isFocused,
                            underline: !this.isFocused
                        });
                    } else {
                        screen.writeString(colX, rowY, label, attrs);
                    }
                } else {
                    // Blank spacer for out-of-bounds days
                    screen.writeString(colX, rowY, '  ', attrs);
                }
            }
        }
    }
}
