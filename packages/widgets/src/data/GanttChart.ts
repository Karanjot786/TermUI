import {
  type Screen,
  type Style,
  type Color,
  styleToCellAttrs,
  stringWidth,
  HORIZONTAL_BAR_SYMBOLS,
  caps,
} from "@termuijs/core";
import { Widget } from "../base/Widget.js";

export interface GanttTask {
  label?: string;
  start: number;
  duration: number;
  color?: Color;
}

export interface GanttChartOptions {
  taskHeight?: number;
  taskGap?: number;
  minTime?: number;
  maxTime?: number;
  barColor?: Color;
  labelColor?: Color;
}

export class GanttChart extends Widget {
  private _tasks: GanttTask[] = [];
  private _taskHeight: number;
  private _taskGap: number;
  private _minTime?: number;
  private _maxTime?: number;
  private _barColor: Color;
  private _labelColor: Color;

  constructor(
    tasks: GanttTask[],
    style: Partial<Style> = {},
    opts: GanttChartOptions = {}
  ) {
    super(style);
    this._tasks = tasks;
    this._taskHeight = opts.taskHeight ?? 1;
    this._taskGap = opts.taskGap ?? 1;
    this._minTime = opts.minTime;
    this._maxTime = opts.maxTime;
    this._barColor = opts.barColor ?? { type: "named", name: "cyan" };
    this._labelColor = opts.labelColor ?? { type: "named", name: "brightBlack" };
  }

  setTasks(tasks: GanttTask[]): void {
    this._tasks = tasks;
    this.markDirty();
  }

  protected _renderSelf(screen: Screen): void {
    const rect = this._getContentRect();
    const { x, y, width, height } = rect;

    if (width <= 0 || height <= 0 || this._tasks.length === 0) return;

    let minT = this._minTime;
    let maxT = this._maxTime;

    // Auto-calculate bounds if missing
    if (minT === undefined || maxT === undefined) {
      let calculatedMin = Infinity;
      let calculatedMax = -Infinity;

      for (const task of this._tasks) {
        if (task.start < calculatedMin) calculatedMin = task.start;
        const end = task.start + task.duration;
        if (end > calculatedMax) calculatedMax = end;
      }

      if (minT === undefined) minT = calculatedMin === Infinity ? 0 : calculatedMin;
      if (maxT === undefined) maxT = calculatedMax === -Infinity ? 100 : calculatedMax;
    }

    const timeSpan = maxT - minT;
    if (timeSpan <= 0) return; // Degenerate span, can't map width

    // Calculate maximum label width
    let maxLabelWidth = 0;
    for (const task of this._tasks) {
      if (task.label) {
        const w = stringWidth(task.label);
        if (w > maxLabelWidth) maxLabelWidth = w;
      }
    }

    const labelColWidth = maxLabelWidth > 0 ? maxLabelWidth + 1 : 0;
    const barAreaWidth = width - labelColWidth;

    if (barAreaWidth <= 0) return; // No space for bars

    let currentY = y;

    for (let i = 0; i < this._tasks.length; i++) {
      const task = this._tasks[i];

      // Prevent rendering past widget height bounds
      if (currentY >= y + height) break;

      for (let row = 0; row < this._taskHeight; row++) {
        const cellY = currentY + row;
        if (cellY >= y + height) break;

        // Render label only on the first row of a task
        if (row === 0 && task.label) {
          const labelStr = task.label.slice(0, maxLabelWidth);
          // Pad to right align or left align. We'll left align for simplicity.
          const padded = labelStr.padEnd(maxLabelWidth);
          screen.writeString(x, cellY, padded, { fg: this._labelColor });
        }

        // Calculate bar geometry using sub-cell precision
        const color = task.color ?? this._barColor;
        
        // Find start column relative to bar area
        // Clamp it to 0 just in case start < minT
        const startOffsetVal = Math.max(0, task.start - minT);
        const startCols = (startOffsetVal / timeSpan) * barAreaWidth;
        const startColInt = Math.floor(startCols);
        
        // Find duration width
        const durWidth = (task.duration / timeSpan) * barAreaWidth;
        
        // Total sub-cells scaled (8 levels per cell)
        let remainingSubCells = Math.round(durWidth * 8);

        const barStartX = x + labelColWidth + startColInt;

        for (let col = 0; col < barAreaWidth - startColInt; col++) {
          if (remainingSubCells <= 0) break;
          const level = Math.min(remainingSubCells, 8);
          let symbol = HORIZONTAL_BAR_SYMBOLS[level] ?? " ";
          if (!caps.unicode && level > 0) {
            symbol = level === 8 ? "=" : "-";
          }
          screen.setCell(barStartX + col, cellY, { char: symbol, fg: color });
          remainingSubCells -= 8;
        }
      }

      currentY += this._taskHeight;
      if (i < this._tasks.length - 1) currentY += this._taskGap;
    }
  }
}
