import { caps, Screen } from "@termuijs/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Histogram } from "./Histogram.js";

function renderHistogram(histogram: Histogram, cols = 20, rows = 10): string[] {
    const screen = new Screen(cols, rows);

    histogram.updateRect({
        x: 0,
        y: 0,
        width: cols,
        height: rows,
    });

    histogram.render(screen);

    return screen.back.map((row) => row.map((cell) => cell.char).join(""));
}

function nonSpaceCells(rows: string[]): number {
    return [...rows.join("")].filter((char) => char !== " ").length;
}

describe("Histogram", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders without error for a 5-value dataset", () => {
        const histogram = new Histogram({}, { bins: 4 });

        histogram.setData([1, 2, 2, 3, 4]);

        expect(() => renderHistogram(histogram)).not.toThrow();
        expect(nonSpaceCells(renderHistogram(histogram))).toBeGreaterThan(0);
    });

    it("empty data renders empty widget", () => {
        const histogram = new Histogram();

        histogram.setData([]);

        expect(() => renderHistogram(histogram)).not.toThrow();
        expect(nonSpaceCells(renderHistogram(histogram))).toBe(0);
    });

    it("rejects invalid bin counts", () => {
        expect(() => new Histogram({}, { bins: 0 })).toThrow(/bins/);
        expect(() => new Histogram({}, { bins: -1 })).toThrow(/bins/);
        expect(() => new Histogram({}, { bins: 1.5 })).toThrow(/bins/);
        expect(() => new Histogram({}, { bins: Number.NaN })).toThrow(/bins/);
    });

    it("setData triggers markDirty", () => {
        const histogram = new Histogram();
        const markDirtySpy = vi.spyOn(histogram, "markDirty");

        histogram.setData([1, 2, 3]);

        expect(markDirtySpy).toHaveBeenCalled();
    });

    it("uses ASCII fallback when caps.unicode is false", () => {
        vi.spyOn(caps, "unicode", "get").mockReturnValue(false);

        const histogram = new Histogram({}, { bins: 3 });

        histogram.setData([1, 2, 2, 3, 4]);

        const rows = renderHistogram(histogram);

        expect(rows.join("")).toContain("|");
    });
});
