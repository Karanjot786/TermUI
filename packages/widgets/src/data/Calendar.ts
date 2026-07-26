// ─────────────────────────────────────────────────────
// @termuijs/widgets — Calendar widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, type KeyEvent, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface CalendarOptions {
    date?: Date;
    selectedColor?: Color;
    todayColor?: Color;
    highlightColor?: Color;
    highlightedDates?: Date[];
    minDate?: Date;
    maxDate?: Date;
    disabledDates?: Date[];
    onSelect?: (date: Date) => void;
    onMonthChange?: (year: number, month: number) => void;
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
    private _highlightColor: Color;
    private _highlightedDatesSet: Set<number> = new Set();
    private _disabledDatesSet: Set<number> = new Set();
    private _minDate?: Date;
    private _maxDate?: Date;
    private _onSelect?: (date: Date) => void;
    private _onMonthChange?: (year: number, month: number) => void;
    focusable = true;

    constructor(style: Partial<Style> = {}, opts: CalendarOptions = {}) {
        super(style);
        this._selectedDate = opts.date ? this._normalizeDate(opts.date) : this._normalizeDate(new Date());
        this._currentMonth = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), 1);
        this._currentMonth.setHours(0, 0, 0, 0);

        this._selectedColor = opts.selectedColor ?? { type: 'named', name: 'cyan' };
        this._todayColor = opts.todayColor ?? { type: 'named', name: 'green' };
        this._highlightColor = opts.highlightColor ?? { type: 'named', name: 'yellow' };

        if (opts.minDate) this._minDate = this._normalizeDate(opts.minDate);
        if (opts.maxDate) this._maxDate = this._normalizeDate(opts.maxDate);

        if (opts.highlightedDates) {
            this._setDatesSet(this._highlightedDatesSet, opts.highlightedDates);
        }
        if (opts.disabledDates) {
            this._setDatesSet(this._disabledDatesSet, opts.disabledDates);
        }

        this._onSelect = opts.onSelect;
        this._onMonthChange = opts.onMonthChange;
    }

    private _normalizeDate(d: Date): Date {
        const normalized = new Date(d);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
    }

    private _setDatesSet(targetSet: Set<number>, dates: Date[]): void {
        targetSet.clear();
        for (const date of dates) {
            targetSet.add(this._normalizeDate(date).getTime());
        }
    }

    setSelectedDate(date: Date): void {
        const norm = this._normalizeDate(date);
        if (this._isDateDisabled(norm)) return;

        this._selectedDate = norm;
        if (
            norm.getMonth() !== this._currentMonth.getMonth() ||
            norm.getFullYear() !== this._currentMonth.getFullYear()
        ) {
            this.setMonth(norm.getFullYear(), norm.getMonth());
        } else {
            this.markDirty();
        }
    }

    getSelectedDate(): Date {
        return new Date(this._selectedDate);
    }

    setMonth(year: number, month: number): void {
        const newMonth = new Date(year, month, 1);
        newMonth.setHours(0, 0, 0, 0);
        const changed =
            newMonth.getFullYear() !== this._currentMonth.getFullYear() ||
            newMonth.getMonth() !== this._currentMonth.getMonth();

        this._currentMonth = newMonth;
        if (changed) {
            this._onMonthChange?.(this._currentMonth.getFullYear(), this._currentMonth.getMonth());
        }
        this.markDirty();
    }

    changeMonth(months: number): void {
        this.setMonth(this._currentMonth.getFullYear(), this._currentMonth.getMonth() + months);
    }

    setHighlightedDates(dates: Date[]): void {
        this._setDatesSet(this._highlightedDatesSet, dates);
        this.markDirty();
    }

    setHighlightColor(color: Color): void {
        this._highlightColor = color;
        this.markDirty();
    }

    setMinDate(date?: Date): void {
        this._minDate = date ? this._normalizeDate(date) : undefined;
        this.markDirty();
    }

    setMaxDate(date?: Date): void {
        this._maxDate = date ? this._normalizeDate(date) : undefined;
        this.markDirty();
    }

    setDisabledDates(dates: Date[]): void {
        this._setDatesSet(this._disabledDatesSet, dates);
        this.markDirty();
    }

    private _isDateDisabled(date: Date): boolean {
        const time = date.getTime();
        if (this._minDate && time < this._minDate.getTime()) return true;
        if (this._maxDate && time > this._maxDate.getTime()) return true;
        if (this._disabledDatesSet.has(time)) return true;
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
                this.changeMonth(-1);
                break;
            case 'pagedown':
                this.changeMonth(1);
                break;
            case 'home': {
                const firstDay = new Date(this._currentMonth.getFullYear(), this._currentMonth.getMonth(), 1);
                this.setSelectedDate(firstDay);
                break;
            }
            case 'end': {
                const lastDay = new Date(this._currentMonth.getFullYear(), this._currentMonth.getMonth() + 1, 0);
                this.setSelectedDate(lastDay);
                break;
            }
            case 'enter':
                if (!this._isDateDisabled(this._selectedDate)) {
                    this._onSelect?.(new Date(this._selectedDate));
                }
                break;
        }
    }

    private _moveSelection(days: number): void {
        const newDate = new Date(this._selectedDate);
        newDate.setDate(newDate.getDate() + days);
        const norm = this._normalizeDate(newDate);

        if (this._isDateDisabled(norm)) return;

        this._selectedDate = norm;

        if (
            norm.getMonth() !== this._currentMonth.getMonth() ||
            norm.getFullYear() !== this._currentMonth.getFullYear()
        ) {
            this.setMonth(norm.getFullYear(), norm.getMonth());
        } else {
            this.markDirty();
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

        const today = this._normalizeDate(new Date());

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

                    const time = cellDate.getTime();
                    const isSelected = time === this._selectedDate.getTime();
                    const isToday = time === today.getTime();
                    const isHighlighted = this._highlightedDatesSet.has(time);
                    const isDisabled = this._isDateDisabled(cellDate);

                    if (isDisabled) {
                        screen.writeString(colX, rowY, label, {
                            ...attrs,
                            dim: true,
                        });
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

