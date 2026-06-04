// DateRangePicker — calendar date range selector widget
import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';

export interface DateRange {
    start: Date;
    end: Date;
}

export interface DateRangePickerOptions {
    value?: Partial<DateRange>;
    onChange?: (range: Partial<DateRange>) => void;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export class DateRangePicker extends Widget {
    private _cursorDate: Date;
    private _currentMonth: Date;
    private _rangeStart: Date | null = null;
    private _rangeEnd: Date | null = null;
    private _selectionState: 'none' | 'start-set' | 'end-set' = 'none';
    private _onChange?: (range: Partial<DateRange>) => void;
    focusable = true;

    constructor(options: DateRangePickerOptions = {}) {
        super(mergeStyles(defaultStyle(), { border: 'single', height: 10 }));

        this._rangeStart = options.value?.start ? this._zeroTime(options.value.start) : null;
        this._rangeEnd = options.value?.end ? this._zeroTime(options.value.end) : null;

        if (this._rangeStart && this._rangeEnd) {
            this._selectionState = 'end-set';
        } else if (this._rangeStart) {
            this._selectionState = 'start-set';
        } else {
            this._selectionState = 'none';
        }

        const baseDate = this._rangeStart || this._rangeEnd || new Date();
        this._cursorDate = this._zeroTime(baseDate);

        this._currentMonth = new Date(this._cursorDate.getFullYear(), this._cursorDate.getMonth(), 1);
        this._onChange = options.onChange;
    }

    private _zeroTime(d: Date): Date {
        const res = new Date(d);
        res.setHours(0, 0, 0, 0);
        return res;
    }

    get range(): Partial<DateRange> {
        const res: Partial<DateRange> = {};
        if (this._rangeStart) res.start = new Date(this._rangeStart);
        if (this._rangeEnd) res.end = new Date(this._rangeEnd);
        return res;
    }

    moveSelection(days: number): void {
        const newDate = new Date(this._cursorDate);
        newDate.setDate(newDate.getDate() + days);
        this._cursorDate = newDate;

        if (newDate.getMonth() !== this._currentMonth.getMonth() || newDate.getFullYear() !== this._currentMonth.getFullYear()) {
            this._currentMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        }
        this.markDirty();
    }

    changeMonth(months: number): void {
        const targetMonth = this._cursorDate.getMonth() + months;
        const targetYear = this._cursorDate.getFullYear();
        const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
        const clampedDay = Math.min(this._cursorDate.getDate(), lastDayOfTarget);
        const newDate = new Date(targetYear, targetMonth, clampedDay);
        this._cursorDate = newDate;
        this._currentMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        this.markDirty();
    }

    confirm(): void {
        const cur = new Date(this._cursorDate);
        if (this._selectionState === 'none' || this._selectionState === 'end-set') {
            this._rangeStart = cur;
            this._rangeEnd = null;
            this._selectionState = 'start-set';
        } else if (this._selectionState === 'start-set') {
            const start = this._rangeStart!;
            if (cur < start) {
                // Swap start and end
                this._rangeEnd = start;
                this._rangeStart = cur;
            } else {
                this._rangeEnd = cur;
            }
            this._selectionState = 'end-set';
        }
        this.markDirty();
        this._onChange?.(this.range);
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
                    const dayDate = new Date(year, this._currentMonth.getMonth(), dayVal);
                    dayDate.setHours(0, 0, 0, 0);
                    const dayTime = dayDate.getTime();

                    const isCursor = this._cursorDate.getTime() === dayTime;
                    const isStart = this._rangeStart !== null && this._rangeStart.getTime() === dayTime;
                    const isEnd = this._rangeEnd !== null && this._rangeEnd.getTime() === dayTime;
                    const isBetween = this._rangeStart !== null && this._rangeEnd !== null &&
                        dayTime > this._rangeStart.getTime() && dayTime < this._rangeEnd.getTime();

                    if (isCursor) {
                        screen.writeString(colX, rowY, label, {
                            ...attrs,
                            bold: true,
                            inverse: this.isFocused,
                            underline: !this.isFocused
                        });
                    } else if (isStart || isEnd) {
                        screen.writeString(colX, rowY, label, {
                            ...attrs,
                            bold: true,
                            fg: { type: 'named', name: 'cyan' },
                            underline: true
                        });
                    } else if (isBetween) {
                        screen.writeString(colX, rowY, label, {
                            ...attrs,
                            fg: { type: 'named', name: 'black' },
                            bg: { type: 'named', name: 'cyan' }
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
