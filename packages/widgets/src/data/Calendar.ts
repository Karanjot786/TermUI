// ─────────────────────────────────────────────────────
// @termuijs/widgets — Calendar widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, type KeyEvent, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface CalendarOptions {
    date?: Date;
    selectedColor?: Color;
    todayColor?: Color;
    onSelect?: (date: Date) => void;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export class Calendar extends Widget {
    private _selectedDate: Date;
    private _currentMonth: Date;
    private _selectedColor: Color;
    private _todayColor: Color;
    private _onSelect?: (date: Date) => void;
    focusable = true;

    constructor(style: Partial<Style> = {}, opts: CalendarOptions = {}) {
        super(style);
        this._selectedDate = opts.date ? new Date(opts.date) : new Date();
        this._selectedDate.setHours(0, 0, 0, 0);

        this._currentMonth = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), 1);
        this._currentMonth.setHours(0, 0, 0, 0);

        this._selectedColor = opts.selectedColor ?? { type: 'named', name: 'cyan' };
        this._todayColor = opts.todayColor ?? { type: 'named', name: 'green' };
        this._onSelect = opts.onSelect;
    }

    setMonth(year: number, month: number): void {
        this._currentMonth = new Date(year, month, 1);
        this._currentMonth.setHours(0, 0, 0, 0);
        this.markDirty();
    }

    getSelectedDate(): Date {
        return new Date(this._selectedDate);
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left':
                this._moveSelection(-1);
                break;
            case 'right':
                this._moveSelection(1);
                break;
            case 'up':
                this._moveSelection(-7);
                break;
            case 'down':
                this._moveSelection(7);
                break;
            case 'enter':
                this._onSelect?.(new Date(this._selectedDate));
                break;
        }
    }

    private _moveSelection(days: number): void {
        const newDate = new Date(this._selectedDate);
        newDate.setDate(newDate.getDate() + days);
        this._selectedDate = newDate;

        if (
            newDate.getMonth() !== this._currentMonth.getMonth() ||
            newDate.getFullYear() !== this._currentMonth.getFullYear()
        ) {
            this._currentMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
            this._currentMonth.setHours(0, 0, 0, 0);
        }
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;

        // Minimum required dimensions to prevent rendering cutoff / overflow
        if (width < 20 || height < 8) return;

        const attrs = styleToCellAttrs(this._style);

        const year = this._currentMonth.getFullYear();
        const month = this._currentMonth.getMonth();

        // 1. Render Month Header (◀ Month Year ▶)
        const prevArrow = caps.unicode ? '◀' : '<';
        const nextArrow = caps.unicode ? '▶' : '>';
        const monthName = MONTH_NAMES[month];
        const title = `${prevArrow} ${monthName} ${year} ${nextArrow}`;
        const titleX = x + Math.floor((width - title.length) / 2);
        screen.writeString(Math.max(x, titleX), y, title, { ...attrs, bold: true });

        // 2. Render Weekdays Header
        const weekdays = 'Su Mo Tu We Th Fr Sa';
        const weekdayX = x + Math.floor((width - weekdays.length) / 2);
        screen.writeString(Math.max(x, weekdayX), y + 1, weekdays, { ...attrs, dim: true });

        // 3. Render Calendar Grid (Days)
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const gridStartY = y + 2;
        const maxWeeks = 6;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let w = 0; w < maxWeeks; w++) {
            const rowY = gridStartY + w;
            if (rowY >= y + height) break;

            for (let d = 0; d < 7; d++) {
                const colX = Math.max(x, weekdayX) + d * 3;
                if (colX >= x + width) continue;

                const dayVal = w * 7 + d - firstDay + 1;

                if (dayVal >= 1 && dayVal <= daysInMonth) {
                    const label = String(dayVal).padStart(2, ' ');
                    const cellDate = new Date(year, month, dayVal);
                    cellDate.setHours(0, 0, 0, 0);

                    const isSelected = cellDate.getTime() === this._selectedDate.getTime();
                    const isToday = cellDate.getTime() === today.getTime();

                    if (isSelected) {
                        screen.writeString(colX, rowY, label, {
                            ...attrs,
                            fg: this._selectedColor,
                            bold: true,
                            inverse: this.isFocused,
                            underline: !this.isFocused,
                        });
                    } else if (isToday) {
                        screen.writeString(colX, rowY, label, {
                            ...attrs,
                            fg: this._todayColor,
                            bold: true,
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
