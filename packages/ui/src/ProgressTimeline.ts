// ─────────────────────────────────────────────────────
// @termuijs/ui — Progress Timeline Component
// ─────────────────────────────────────────────────────
import {
    type KeyEvent,
    type Screen,
    type Style,
    defaultStyle,
    mergeStyles,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';
import { Widget } from '@termuijs/widgets';

export type TimelineStepStatus = 'completed' | 'active' | 'error' | 'pending' | 'skipped';

export type TimelineOrientation = 'vertical' | 'horizontal';

export interface TimelineStep {
    label: string;
    description?: string;
    date?: string;
    status?: TimelineStepStatus;
    icon?: string;
    color?: Style['fg'];
}

export interface ProgressTimelineOptions {
    orientation?: TimelineOrientation;
    completedColor?: Style['fg'];
    activeColor?: Style['fg'];
    errorColor?: Style['fg'];
    pendingColor?: Style['fg'];
    skippedColor?: Style['fg'];
    connectorColor?: Style['fg'];
    showStepNumbers?: boolean;
    showDates?: boolean;
    connectorChar?: string;
    selectedColor?: Style['fg'];
}

const DEFAULT_OPTIONS: Required<ProgressTimelineOptions> = {
    orientation: 'vertical',
    completedColor: { type: 'named', name: 'green' },
    activeColor: { type: 'named', name: 'cyan' },
    errorColor: { type: 'named', name: 'red' },
    pendingColor: { type: 'named', name: 'brightBlack' },
    skippedColor: { type: 'named', name: 'yellow' },
    connectorColor: { type: 'named', name: 'brightBlack' },
    showStepNumbers: false,
    showDates: true,
    connectorChar: '',
    selectedColor: { type: 'named', name: 'white' },
};

export class ProgressTimeline extends Widget {
    private _steps: TimelineStep[];
    private _opts: Required<ProgressTimelineOptions>;
    private _selectedIndex: number;

    focusable = true;

    constructor(steps: TimelineStep[], style: Partial<Style> = {}, opts: ProgressTimelineOptions = {}) {
        super(mergeStyles(defaultStyle(), style));
        this._steps = steps.map(s => ({ ...s }));
        this._opts = { ...DEFAULT_OPTIONS, ...opts };
        this._selectedIndex = this._clampSelection(this._findActiveIndex());
    }

    setSteps(steps: TimelineStep[]): void {
        this._steps = steps.map(s => ({ ...s }));
        this._selectedIndex = this._clampSelection(this._findActiveIndex());
        this.markDirty();
    }

    getSteps(): TimelineStep[] { return this._steps.map(s => ({ ...s })); }

    setStepStatus(index: number, status: TimelineStepStatus): void {
        if (index < 0 || index >= this._steps.length) return;
        this._steps[index].status = status;
        this.markDirty();
    }

    getSelectedIndex(): number { return this._selectedIndex; }

    setSelectedIndex(index: number): void {
        this._selectedIndex = this._clampSelection(index);
        this.markDirty();
    }

    advanceStep(index: number = this._selectedIndex): void {
        if (index < 0 || index >= this._steps.length - 1) return;
        this._steps[index].status = 'completed';
        this._steps[index + 1].status = 'active';
        this._selectedIndex = this._clampSelection(index + 1);
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'up':
            case 'left':
                this.setSelectedIndex(this._selectedIndex - 1);
                break;
            case 'down':
            case 'right':
                this.setSelectedIndex(this._selectedIndex + 1);
                break;
            case 'enter':
                this.advanceStep(this._selectedIndex);
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._steps.length === 0) return;
        if (this._opts.orientation === 'horizontal') {
            this._renderHorizontal(screen, x, y, width, height);
        } else {
            this._renderVertical(screen, x, y, width, height);
        }
    }

    private _clampSelection(index: number): number {
        if (this._steps.length === 0) return 0;
        return Math.max(0, Math.min(index, this._steps.length - 1));
    }

    private _findActiveIndex(): number {
        const idx = this._steps.findIndex(s => s.status === 'active');
        return idx === -1 ? 0 : idx;
    }

    private _getStatusColor(status: TimelineStepStatus): Style['fg'] {
        switch (status) {
            case 'completed': return this._opts.completedColor;
            case 'active': return this._opts.activeColor;
            case 'error': return this._opts.errorColor;
            case 'skipped': return this._opts.skippedColor;
            default: return this._opts.pendingColor;
        }
    }

    private _getStatusIcon(status: TimelineStepStatus, stepNum: number): string {
        if (this._opts.showStepNumbers) return String(stepNum).padStart(2, ' ');
        switch (status) {
            case 'completed': return caps.unicode ? '✓' : '+';
            case 'active': return caps.unicode ? '●' : '*';
            case 'error': return caps.unicode ? '✗' : 'X';
            case 'skipped': return caps.unicode ? '→' : '>';
            default: return caps.unicode ? '○' : '-';
        }
    }

    private _getLineChar(): string {
        if (this._opts.connectorChar) return this._opts.connectorChar;
        return caps.unicode ? '│' : '|';
    }

    private _getCursorChar(): string {
        return caps.unicode ? '▶' : '>';
    }

    private _renderVertical(screen: Screen, x: number, y: number, width: number, height: number): void {
        const attrs = styleToCellAttrs(this._style);
        const lineChar = this._getLineChar();
        const cursorChar = this._getCursorChar();
        let row = 0;
        for (let i = 0; i < this._steps.length; i++) {
            if (row >= height) break;
            const step = this._steps[i];
            const status = step.status ?? 'pending';
            const color = step.color ?? this._getStatusColor(status);
            const isActive = status === 'active';
            const isSelected = i === this._selectedIndex;
            const icon = step.icon ?? this._getStatusIcon(status, i + 1);
            const iconX = x + (isSelected ? 2 : 0);
            if (isSelected) {
                screen.writeString(x, y + row, cursorChar, {
                    ...attrs,
                    fg: this._opts.selectedColor,
                    bold: true,
                });
            }
            screen.writeString(iconX, y + row, icon + ' ', { ...attrs, fg: color, bold: isActive || status === 'error' });
            const labelX = x + (isSelected ? 6 : 4);
            const maxLabelWidth = width - (isSelected ? 6 : 4);
            screen.writeString(labelX, y + row, step.label.slice(0, maxLabelWidth), {
                ...attrs,
                fg: color,
                bold: isActive,
                dim: status === 'pending' || status === 'skipped',
                inverse: isSelected,
            });
            row++;
            if (step.description && row < height) {
                screen.writeString(x, y + row, '   ' + step.description.slice(0, width - 3), { ...attrs, dim: true });
                row++;
            }
            if (step.date && this._opts.showDates && row < height) {
                screen.writeString(x, y + row, '   ' + step.date.slice(0, width - 3), { ...attrs, fg: { type: 'named', name: 'brightBlack' }, dim: true });
                row++;
            }
            if (i < this._steps.length - 1 && row < height) {
                screen.setCell(x, y + row, { char: lineChar, fg: this._opts.connectorColor });
                row++;
            }
        }
    }

    private _renderHorizontal(screen: Screen, x: number, y: number, width: number, height: number): void {
        const attrs = styleToCellAttrs(this._style);
        const stepsPerRow = Math.max(1, Math.floor(width / 20));
        let col = 0;
        let row = 0;
        for (let i = 0; i < this._steps.length; i++) {
            if (row >= height) break;
            const step = this._steps[i];
            const status = step.status ?? 'pending';
            const color = step.color ?? this._getStatusColor(status);
            const isActive = status === 'active';
            const isSelected = i === this._selectedIndex;
            const stepX = x + col * 20;
            if (stepX + 20 > x + width) { col = 0; row += 3; if (row >= height) break; continue; }
            const icon = step.icon ?? this._getStatusIcon(status, i + 1);
            const cellAttrs = {
                ...attrs,
                fg: color,
                bold: isActive || status === 'error',
                inverse: isSelected,
            };
            const prefix = isSelected ? this._getCursorChar() + ' ' : '  ';
            screen.writeString(stepX, y + row, prefix + icon + ' ', cellAttrs);
            if (row + 1 < height) {
                screen.writeString(stepX, y + row + 1, '  ' + step.label.slice(0, 14).padEnd(14), {
                    ...attrs,
                    fg: color,
                    bold: isActive,
                    dim: status === 'pending',
                    inverse: isSelected,
                });
            }
            if (step.date && this._opts.showDates && row + 2 < height) {
                screen.writeString(stepX, y + row + 2, step.date.slice(0, 14).padStart(16), { ...attrs, fg: { type: 'named', name: 'brightBlack' }, dim: true });
            }
            if (i < this._steps.length - 1 && col < stepsPerRow - 1) {
                const connX = stepX + 4;
                const conn = caps.unicode ? '────' : '----';
                if (connX + 4 <= x + width) screen.writeString(connX, y + row, conn, { ...attrs, fg: this._opts.connectorColor });
            }
            col++;
        }
    }
}
