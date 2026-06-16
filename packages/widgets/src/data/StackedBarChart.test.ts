import { caps, Screen } from "@termuijs/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StackedBarChart } from "./StackedBarChart.js";

function renderChart(chart: StackedBarChart, cols = 20, rows = 10): string[] {
    const screen = new Screen(cols, rows);
    chart.updateRect({ x: 0, y: 0, width: cols, height: rows });
    chart.render(screen);
    return screen.back.map((row) => row.map((cell) => cell.char).join(""));
}

function nonSpaceCells(rows: string[]): number {
    return rows
        .join("")
        .split("")
        .filter((char) => char !== " ").length;
}

describe("StackedBarChart", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders a single series without error", () => {
        const chart = new StackedBarChart({}, { categories: ["A", "B"] });

        chart.setSeries([{ label: "Series A", data: [1, 2] }]);

        expect(() => renderChart(chart)).not.toThrow();
        expect(nonSpaceCells(renderChart(chart))).toBeGreaterThan(0);
    });

    it("two series stack per category", () => {
        const chart = new StackedBarChart({}, { categories: ["A"] });

        chart.setSeries([
            { label: "Bottom", data: [1] },
            { label: "Top", data: [3] },
        ]);

        expect(() => renderChart(chart, 12, 8)).not.toThrow();

        const rows = renderChart(chart, 12, 8);
        expect(nonSpaceCells(rows)).toBeGreaterThan(0);
        expect(rows.at(-1)).toContain("A");
    });

    it("renders category labels along the x axis", () => {
        const chart = new StackedBarChart({}, { categories: ["A", "B"] });

        chart.setSeries([{ label: "Series A", data: [1, 2] }]);

        const rows = renderChart(chart, 20, 8);

        expect(rows.at(-1)).toContain("A");
        expect(rows.at(-1)).toContain("B");
    });

    it("setSeries triggers markDirty", () => {
        const chart = new StackedBarChart();
        const markDirtySpy = vi.spyOn(chart, "markDirty");

        chart.setSeries([{ label: "A", data: [1, 2] }]);

        expect(markDirtySpy).toHaveBeenCalled();
    });

    it("uses ASCII fallback when caps.unicode is false", () => {
        vi.spyOn(caps, "unicode", "get").mockReturnValue(false);

        const chart = new StackedBarChart({}, { categories: ["A"] });
        chart.setSeries([{ label: "A", data: [2] }]);

        const rows = renderChart(chart, 10, 8);

        expect(rows.join("")).toContain("|");
    });
});
