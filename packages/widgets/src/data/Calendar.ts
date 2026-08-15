// ─────────────────────────────────────────────────────
// @termuijs/widgets — Calendar widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, type KeyEvent, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface CalendarOptions {
    date?: Date;
    selectedColor?: Color;
    todayColor?: Color;
    weekendColor?: Color;
    headerColor?: Color;
    weekdayColor?: Color;
    onSelect?: (date: Date) => void;
    onMonthChange?: (year: number, month: number) => void;
    showWeekNumbers?: boolean;
    minDate?: Date;
    maxDate?: Date;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export class Calendar extends Widget {
    private _selectedDate: Date;
    private _currentMonth: Date;
    private _selectedColor: Color;
    private _todayColor: Color;
    private _weekendColor: Color;
    private _headerColor: Color;
    private _weekdayColor: Color;
    private _onSelect?: (date: Date) => void;
    private _onMonthChange?: (year: number, month: number) => void;
    private _showWeekNumbers: boolean;
    private _minDate?: Date;
    private _maxDate?: Date;
    focusable = true;

    constructor(style: Partial<Style> = {}, opts: CalendarOptions = {}) {
        super(style);
        this._selectedDate = opts.date ? this._normalizeDate(opts.date) : this._normalizeDate(new Date());
        this._currentMonth = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), 1);
        this._currentMonth.setHours(0, 0, 0, 0);

        this._selectedColor = opts.selectedColor ?? { type: 'named', name: 'cyan' };
        this._todayColor = opts.todayColor ?? { type: 'named', name: 'green' };
        this._weekendColor = opts.weekendColor ?? { type: 'named', name: 'red' };
        this._headerColor = opts.headerColor ?? { type: 'named', name: 'yellow' };
        this._weekdayColor = opts.weekdayColor ?? { type: 'named', name: 'brightBlack' };
        this._onSelect = opts.onSelect;
        this._onMonthChange = opts.onMonthChange;
        this._showWeekNumbers = opts.showWeekNumbers ?? false;
        this._minDate = opts.minDate ? new Date(opts.minDate) : undefined;
        this._maxDate = opts.maxDate ? new Date(opts.maxDate) : undefined;
    }

    setMonth(year: number, month: number): void {
        this._currentMonth = new Date(year, month, 1);
        this._currentMonth.setHours(0, 0, 0, 0);
        this._onMonthChange?.(year, month);
        this.markDirty();
    }

    getSelectedDate(): Date {
        return new Date(this._selectedDate);
    }

    setSelectedDate(date: Date): void {
        this._selectedDate = new Date(date);
        this._selectedDate.setHours(0, 0, 0, 0);
        this._currentMonth = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), 1);
        this._currentMonth.setHours(0, 0, 0, 0);
        this.markDirty();
    }

    getCurrentMonth(): Date {
        return new Date(this._currentMonth);
    }

    goToNextMonth(): void {
        const year = this._currentMonth.getFullYear();
        const month = this._currentMonth.getMonth();
        if (month === 11) {
            this.setMonth(year + 1, 0);
        } else {
            this.setMonth(year, month + 1);
        }
    }

    goToPrevMonth(): void {
        const year = this._currentMonth.getFullYear();
        const month = this._currentMonth.getMonth();
        if (month === 0) {
            this.setMonth(year - 1, 11);
        } else {
            this.setMonth(year, month - 1);
        }
    }

    goToNextYear(): void {
        this.setMonth(this._currentMonth.getFullYear() + 1, this._currentMonth.getMonth());
    }

    goToPrevYear(): void {
        this.setMonth(this._currentMonth.getFullYear() - 1, this._currentMonth.getMonth());
    }

    goToToday(): void {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this._selectedDate = today;
        this._currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        this._currentMonth.setHours(0, 0, 0, 0);
        this.markDirty();
    }

    private _isDateDisabled(date: Date): boolean {
        if (this._minDate && date < this._minDate) return true;
        if (this._maxDate && date > this._maxDate) return true;
        return false;
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
            case 'pageup':
                this.goToPrevMonth();
                break;
            case 'pagedown':
                this.goToNextMonth();
                break;
            case 'home':
                this.goToPrevYear();
                break;
            case 'end':
                this.goToNextYear();
                break;
            case 'enter':
            case 'space':
                this._onSelect?.(new Date(this._selectedDate));
                break;
            case 't':
                this.goToToday();
                break;
        }
    }

    private _moveSelection(days: number): void {
        const newDate = new Date(this._selectedDate);
        newDate.setDate(newDate.getDate() + days);

        // Clamp to min/max dates
        if (this._isDateDisabled(newDate)) return;

        this._selectedDate = newDate;

        if (
            norm.getMonth() !== this._currentMonth.getMonth() ||
            norm.getFullYear() !== this._currentMonth.getFullYear()
        ) {
            this._currentMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
            this._currentMonth.setHours(0, 0, 0, 0);
            this._onMonthChange?.(newDate.getFullYear(), newDate.getMonth());
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;

        // Minimum required dimensions to prevent rendering cutoff / overflow
        if (width < 20 || height < 8) return;

        const attrs = styleToCellAttrs(this._style);

        const year = this._currentMonth.getFullYear();
        const month = this._currentMonth.getMonth();

        // Calculate column offsets
        const dayColWidth = 3;
        const weekNumWidth = this._showWeekNumbers ? 4 : 0;
        const gridWidth = 7 * dayColWidth;
        const totalWidth = weekNumWidth + gridWidth;
        const gridOffset = x + Math.floor((width - totalWidth) / 2);
        const gridX = Math.max(x, gridOffset);

        // 1. Render Month Header (◀ Month Year ▶)
        const prevArrow = caps.unicode ? '◀' : '<';
        const nextArrow = caps.unicode ? '▶' : '>';
        const monthName = MONTH_NAMES[month];
        const title = `${prevArrow} ${monthName} ${year} ${nextArrow}`;
        const titleX = x + Math.floor((width - title.length) / 2);
        screen.writeString(Math.max(x, titleX), y, title, { ...attrs, fg: this._headerColor, bold: true });

        // 2. Render Weekdays Header
        let weekdayStr = '';
        if (this._showWeekNumbers) weekdayStr += '    ';
        for (let d = 0; d < 7; d++) {
            weekdayStr += DAY_NAMES[d] + (d < 6 ? ' ' : '');
        }
        const weekdayX = gridX + weekNumWidth;
        screen.writeString(weekdayX, y + 1, weekdayStr.slice(0, gridWidth), { ...attrs, fg: this._weekdayColor, dim: true });

        // 3. Render Calendar Grid (Days)
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const gridStartY = y + 2;
        const maxWeeks = 6;

        const today = this._normalizeDate(new Date());

        for (let w = 0; w < maxWeeks; w++) {
            const rowY = gridStartY + w;
            if (rowY >= y + height) break;

            // Week number column
            if (this._showWeekNumbers) {
                const weekDate = new Date(year, month, w * 7 + 1 - firstDay);
                const weekNum = this._getWeekNumber(weekDate);
                screen.writeString(gridX, rowY, `${String(weekNum).padStart(2, ' ')} `, { ...attrs, dim: true });
            }

            for (let d = 0; d < 7; d++) {
                const colX = weekdayX + d * dayColWidth;
                if (colX >= x + width) continue;

                const dayVal = w * 7 + d - firstDay + 1;

                if (dayVal >= 1 && dayVal <= daysInMonth) {
                    const label = String(dayVal).padStart(2, ' ');
                    const cellDate = new Date(year, month, dayVal);
                    cellDate.setHours(0, 0, 0, 0);

                    const isSelected = cellDate.getTime() === this._selectedDate.getTime();
                    const isToday = cellDate.getTime() === today.getTime();
                    const isWeekend = d === 0 || d === 6;
                    const isDisabled = this._isDateDisabled(cellDate);

                    if (isDisabled) {
                        screen.writeString(colX, rowY, label, { ...attrs, dim: true });
                    } else if (isSelected) {
                        screen.writeString(colX, rowY, label, {
                            ...attrs,
                            fg: this._selectedColor,
                            bold: true,
                            inverse: this.isFocused,
                            underline: !this.isFocused,
                        });
                    } else if (isHighlighted) {
                        screen.writeString(colX, rowY, label, {
                            ...attrs,
                            fg: this._highlightColor,
                            bold: true,
                        });
                    } else if (isToday) {
                        screen.writeString(colX, rowY, label, {
                            ...attrs,
                            fg: this._todayColor,
                            bold: true,
                        });
                    } else if (isWeekend) {
                        screen.writeString(colX, rowY, label, {
                            ...attrs,
                            fg: this._weekendColor,
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

    private _getWeekNumber(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
}
