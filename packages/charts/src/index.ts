<<<<<<< HEAD
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
=======
// ─────────────────────────────────────────────────────
// @termuijs/charts — Charts dashboard bundle
// Re-exports the AreaChart, PieChart, and Gauge widgets
// from @termuijs/widgets as a focused dashboard package.
// ─────────────────────────────────────────────────────

export { AreaChart } from '@termuijs/widgets';
export type { AreaChartOptions } from '@termuijs/widgets';

export { PieChart } from '@termuijs/widgets';
export type { PieSlice, PieChartOptions } from '@termuijs/widgets';

export { Gauge } from '@termuijs/widgets';
export type { GaugeOptions } from '@termuijs/widgets';
>>>>>>> upstream/main
