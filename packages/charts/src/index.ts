export interface ChartDataPoint {
    label: string;
    value: number;
}

export class AreaChart {
    constructor(public data: ChartDataPoint[] = []) {}

    update(data: ChartDataPoint[]): void {
        this.data = data;
    }

    render(): string {
        return 'AreaChart';
    }
}

export class PieChart {
    constructor(public data: ChartDataPoint[] = []) {}

    update(data: ChartDataPoint[]): void {
        this.data = data;
    }

    render(): string {
        return 'PieChart';
    }
}

export class Gauge {
    constructor(public value = 0) {}

    setValue(value: number): void {
        this.value = value;
    }

    render(): string {
        return `Gauge(${this.value}%)`;
    }
}