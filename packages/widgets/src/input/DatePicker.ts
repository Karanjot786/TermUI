export interface DatePickerOptions {
    selectedDate?: Date;
    format?: string;
    onSelect?: (date: Date) => void;
}

export class DatePicker {
    private currentDate: Date;
    private selectedDate: Date | null;
    private format: string;
    private onSelect?: (date: Date) => void;

    constructor(options: DatePickerOptions = {}) {
        this.currentDate = new Date();
        this.selectedDate = options.selectedDate ?? null;
        this.format = options.format ?? "DD/MM/YYYY";
        this.onSelect = options.onSelect;
    }

    getCurrentMonth(): number {
        return this.currentDate.getMonth() + 1;
    }

    getCurrentYear(): number {
        return this.currentDate.getFullYear();
    }

    nextMonth(): void {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    }

    previousMonth(): void {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    }

    selectDate(date: Date): void {
        this.selectedDate = date;

        if (this.onSelect) {
            this.onSelect(date);
        }
    }

    getSelectedDate(): Date | null {
        return this.selectedDate;
    }

    formatDate(): string {
        if (!this.selectedDate) {
            return "";
        }

        return this.selectedDate.toLocaleDateString();
    }

    getCalendarDays(): number[] {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        return Array.from(
            { length: new Date(year, month + 1, 0).getDate() },
            (_, index) => index + 1
        );
    }
}