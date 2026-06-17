// ─────────────────────────────────────────────────────
// @termuijs/widgets — Stepper widget
// Renders sequential step progress with status indicators
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type Color,
    styleToCellAttrs,
    stringWidth,
    truncate,
    caps,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type StepStatus = 'completed' | 'active' | 'pending';
export type StepperOrientation = 'horizontal' | 'vertical';

export interface StepperStep {
    /** Step label */
    label: string;
    /** Step status. Default: 'pending' */
    status?: StepStatus;
}

export interface StepperOptions {
    /** Layout direction. Default: 'horizontal' */
    orientation?: StepperOrientation;
    /** Color for active step. Default: cyan */
    activeColor?: Color;
    /** Color for completed step. Default: green */
    completedColor?: Color;
    /** Color for pending step. Default: white */
    pendingColor?: Color;
}

/**
 * Stepper — renders a sequence of steps with status indicators.
 *
 * Horizontal example:
 *   ✓ Setup ──── ● Config ──── ○ Review ──── ○ Done
 *
 * Vertical example:
 *   ✓ Setup
 *   │
 *   ● Config
 *   │
 *   ○ Review
 *
 * Icons: ✓/+ (completed), ●/* (active), ○/- (pending)
 * Unicode fallback via caps.unicode.
 */
export class Stepper extends Widget {
    private _steps: StepperStep[];
    private _orientation: StepperOrientation;
    private _activeColor: Color;
    private _completedColor: Color;
    private _pendingColor: Color;

    constructor(
        steps: StepperStep[],
        style: Partial<Style> = {},
        opts: StepperOptions = {},
    ) {
        super(style);
        // Clone steps to prevent external mutation bypassing markDirty()
        this._steps = steps.map(s => ({ ...s }));
        this._orientation = opts.orientation ?? 'horizontal';
        this._activeColor = opts.activeColor ?? { type: 'named', name: 'cyan' };
        this._completedColor = opts.completedColor ?? { type: 'named', name: 'green' };
        this._pendingColor = opts.pendingColor ?? { type: 'named', name: 'white' };
    }

    // ── Public API ──────────────────────────────────────────────────────

    /** Replace all steps. Clones input to prevent external mutation. */
    setSteps(steps: StepperStep[]): void {
        this._steps = steps.map(s => ({ ...s }));
        this.markDirty();
    }

    /** Get current steps. Returns copies to prevent external mutation. */
    getSteps(): StepperStep[] {
        return this._steps.map(s => ({ ...s }));
    }

    /** Update the status of a single step by index. */
    setStepStatus(index: number, status: StepStatus): void {
        if (index < 0 || index >= this._steps.length) return;
        this._steps[index].status = status;
        this.markDirty();
    }

    /** Advance the active step to the next one. */
    nextStep(): void {
        const activeIdx = this._steps.findIndex(s => s.status === 'active');
        if (activeIdx === -1 || activeIdx >= this._steps.length - 1) return;
        this._steps[activeIdx].status = 'completed';
        this._steps[activeIdx + 1].status = 'active';
        this.markDirty();
    }

    /** Move the active step to the previous one. */
    prevStep(): void {
        const activeIdx = this._steps.findIndex(s => s.status === 'active');
        if (activeIdx <= 0) return;
        this._steps[activeIdx].status = 'pending';
        this._steps[activeIdx - 1].status = 'active';
        this.markDirty();
    }

    // ── Render ──────────────────────────────────────────────────────────

    /** Render all steps with connectors and status icons. */
    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._steps.length === 0) return;

        if (this._orientation === 'horizontal') {
            this._renderHorizontal(screen, x, y, width);
        } else {
            this._renderVertical(screen, x, y, width, height);
        }
    }

    // ── Private ─────────────────────────────────────────────────────────

    /** Render steps left-to-right on a single row. */
    private _renderHorizontal(
        screen: Screen,
        x: number,
        y: number,
        width: number,
    ): void {
        const attrs = styleToCellAttrs(this._style);
        const connector = caps.unicode ? '────' : '----';
        let cursorX = x;

        for (let i = 0; i < this._steps.length; i++) {
            if (cursorX >= x + width) break;
            const step = this._steps[i];
            const status = step.status ?? 'pending';
            const { icon, color, bold, dim } = this._stepStyle(status);

            // Icon
            screen.setCell(cursorX, y, { char: icon, fg: color, bold, dim });
            cursorX++;

            // Space + label
            const labelStr = ' ' + step.label;
            const labelWidth = stringWidth(labelStr);
            if (cursorX + labelWidth > x + width) break;
            screen.writeString(cursorX, y, labelStr, { ...attrs, fg: color, bold, dim });
            cursorX += labelWidth;

            // Connector between steps (not after last)
            if (i < this._steps.length - 1) {
                const connWidth = stringWidth(connector);
                if (cursorX + connWidth > x + width) break;
                screen.writeString(cursorX, y, connector, {
                    ...attrs,
                    fg: { type: 'named', name: 'brightBlack' },
                });
                cursorX += connWidth;
            }
        }
    }

    /** Render steps top-to-bottom with vertical connectors. */
    private _renderVertical(
        screen: Screen,
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
        const attrs = styleToCellAttrs(this._style);
        const connectorChar = caps.unicode ? '│' : '|';
        let row = 0;

        for (let i = 0; i < this._steps.length; i++) {
            if (row >= height) break;
            const step = this._steps[i];
            const status = step.status ?? 'pending';
            const { icon, color, bold, dim } = this._stepStyle(status);

            // Icon + label row — use truncate for correct terminal cell width clipping
            const line = icon + ' ' + step.label;
            screen.writeString(x, y + row, truncate(line, width), {
                ...attrs,
                fg: color,
                bold,
                dim,
            });
            row++;

            // Connector row between steps (not after last)
            if (i < this._steps.length - 1 && row < height) {
                screen.setCell(x, y + row, {
                    char: connectorChar,
                    fg: { type: 'named', name: 'brightBlack' },
                });
                row++;
            }
        }
    }

    /** Returns the icon, color, and text attributes for a given status. */
    private _stepStyle(status: StepStatus): {
        icon: string;
        color: Color;
        bold: boolean;
        dim: boolean;
    } {
        switch (status) {
            case 'completed':
                return {
                    icon: caps.unicode ? '✓' : '+',
                    color: this._completedColor,
                    bold: false,
                    dim: false,
                };
            case 'active':
                return {
                    icon: caps.unicode ? '●' : '*',
                    color: this._activeColor,
                    bold: true,
                    dim: false,
                };
            default:
                return {
                    icon: caps.unicode ? '○' : '-',
                    color: this._pendingColor,
                    bold: false,
                    dim: true,
                };
        }
    }
}