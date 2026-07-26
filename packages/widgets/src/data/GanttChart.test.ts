import { describe, it, expect, vi, afterEach } from "vitest";
import { Screen, HORIZONTAL_BAR_SYMBOLS, caps } from "@termuijs/core";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GanttChart", () => {
  it("constructs with empty tasks", async () => {
    const { GanttChart } = await import("./GanttChart.js");
    const chart = new GanttChart([]);
    // shouldn't throw on render
    const screen = new Screen(40, 10);
    chart.updateRect({ x: 0, y: 0, width: 40, height: 10 });
    chart.render(screen);
    expect(screen.back[0].map(c => c.char).join("").trim()).toBe("");
  });

  it("calculates implicit minTime and maxTime", async () => {
    const { GanttChart } = await import("./GanttChart.js");
    const chart = new GanttChart([
      { label: "A", start: 10, duration: 5 },
      { label: "B", start: 5, duration: 20 }
    ]);
    
    // Auto span is from 5 to 25 (minTime=5, maxTime=25) => timeSpan = 20.
    // Screen is 40 width. Label max width is 1. Plus 1 gap = 2 cols for label.
    // Bar area width = 38.
    
    chart.updateRect({ x: 0, y: 0, width: 40, height: 10 });
    const screen = new Screen(40, 10);
    chart.render(screen);

    // Row 0 is Task A. Label "A". It starts at 10.
    // Offset from minTime(5) = 5.
    // Start Col = (5 / 20) * 38 = 9.5 => index 9
    // Duration = (5 / 20) * 38 = 9.5
    // So bar starts at x = 2 + 9 = 11.
    const row0 = screen.back[0].map(c => c.char).join("");
    expect(row0).toContain("A");
    expect(row0).toContain(HORIZONTAL_BAR_SYMBOLS[8]); // Has full blocks
  });

  it("renders with explicit bounds", async () => {
    const { GanttChart } = await import("./GanttChart.js");
    const chart = new GanttChart(
      [{ label: "LongTask", start: 0, duration: 100 }],
      {},
      { minTime: -50, maxTime: 150 } // Time span 200
    );

    chart.updateRect({ x: 0, y: 0, width: 50, height: 5 });
    const screen = new Screen(50, 5);
    chart.render(screen);

    const row0 = screen.back[0].map(c => c.char).join("");
    expect(row0).toContain("LongTask");
    // Since start is 0, offset is 50. dur is 100.
    expect(row0).toContain(HORIZONTAL_BAR_SYMBOLS[8]);
  });

  it("uses ASCII fallback when caps.unicode is false", async () => {
    const { GanttChart } = await import("./GanttChart.js");
    vi.spyOn(caps, "unicode", "get").mockReturnValue(false);

    const chart = new GanttChart([
      { label: "A", start: 10, duration: 5 }
    ]);
    
    chart.updateRect({ x: 0, y: 0, width: 40, height: 10 });
    const screen = new Screen(40, 10);
    chart.render(screen);

    const row0 = screen.back[0].map(c => c.char).join("");
    expect(row0).toContain("="); // ASCII fallback full block
    expect(row0).not.toContain(HORIZONTAL_BAR_SYMBOLS[8]);
  });

  it("preserves fractional start position for precise bar placement", async () => {
    const { GanttChart } = await import("./GanttChart.js");
    // minTime=0, maxTime=100, timeSpan=100
    // Bar area width = 20 (width=40, label=20 cols)
    // Task start=12.5, duration=30
    // startCols = (12.5/100)*20 = 2.5
    const chart = new GanttChart(
      [{ label: "Task", start: 12.5, duration: 30 }],
      {},
      { minTime: 0, maxTime: 100 }
    );

    chart.updateRect({ x: 0, y: 0, width: 40, height: 5 });
    const screen = new Screen(40, 5);
    chart.render(screen);

    // Duration 30/100*20 = 6 cols = 48 sub-cells
    // Fractional offset: 0.5 * 8 = 4 sub-cells
    // remaining = 48 - 4 = 44 sub-cells
    // First cell at level 4 (partial fill due to 0.5 fractional start)
    const row0 = screen.back[0];
    const barStartCol = 20 + 2; // label width 20 + int(startCols)=2
    const firstBarCell = row0[barStartCol];
    expect(firstBarCell?.char).toBe(HORIZONTAL_BAR_SYMBOLS[4]);
    const secondBarCell = row0[barStartCol + 1];
    expect(secondBarCell?.char).toBe(HORIZONTAL_BAR_SYMBOLS[8]);
  });
});
