// ─────────────────────────────────────────────────────
// @termuijs/ui — SetupFlow
// Multi-step CLI tool setup wizard with branded header
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type KeyEvent,
    styleToCellAttrs,
    truncate,
    stringWidth,
    mergeStyles,
    defaultStyle,
    caps,
} from '@termuijs/core';
import { Widget } from '@termuijs/widgets';

export interface SetupStep {
    title: string;
    render: () => Widget;
}

export interface SetupFlowOptions {
    appName: string;
    steps: SetupStep[];
    onComplete: () => void;
    onCancel?: () => void;
    style?: Partial<Style>;
}

export class SetupFlow extends Widget {
    private _appName: string;
    private _steps: SetupStep[];
    private _stepWidgets: Widget[];
    private _currentIndex = 0;
    private _complete = false;
    private _onComplete: () => void;
    private _onCancel?: () => void;
    focusable = true;

    constructor(options: SetupFlowOptions) {
        super(mergeStyles(defaultStyle(), { flexGrow: 1, ...options.style }));
        this._appName   = options.appName;
        this._steps     = options.steps;
        this._onComplete = options.onComplete;
        this._onCancel   = options.onCancel;
        this._stepWidgets = options.steps.map(s => s.render());
    }

    get currentStepIndex(): number { return this._currentIndex; }
    get isComplete(): boolean { return this._complete; }

    next(): void {
        if (this._complete) return;
        if (this._currentIndex >= this._steps.length - 1) {
            this._complete = true;
            this._onComplete();
        } else {
            this._currentIndex++;
        }
        this.markDirty();
    }

    prev(): void {
        if (this._currentIndex <= 0) return;
        this._currentIndex--;
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'return': this.next(); break;
            case 'escape': this._onCancel?.(); break;
            case 'left':   this.prev(); break;
            case 'right':  this.next(); break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        let row = y;

        // ── Header ────────────────────────────────────
        const header = ` Setup: ${this._appName} `;
        const headerX = x + Math.max(0, Math.floor((width - stringWidth(header)) / 2));
        screen.writeString(headerX, row, header, { ...attrs, bold: true });
        row++;

        // ── Step progress indicator ────────────────────
        if (row < y + height && this._steps.length > 0) {
            const done = caps.unicode ? '✓' : 'v';
            const curr = caps.unicode ? '►' : '>';
            const sep  = caps.unicode ? '│' : '|';
            const parts = this._steps.map((s, i) => {
                if (i < this._currentIndex) return `${done} ${s.title}`;
                if (i === this._currentIndex) return `${curr} ${s.title}`;
                return `  ${s.title}`;
            });
            const progress = parts.join(`  ${sep}  `);
            screen.writeString(x, row, truncate(progress, width), {
                ...attrs,
                dim: false,
                bold: false,
            });
            row += 2;
        }

        // ── Divider ───────────────────────────────────
        if (row < y + height) {
            screen.writeString(x, row, (caps.unicode ? '─' : '-').repeat(width), { ...attrs, dim: true });
            row++;
        }

        // ── Current step widget ───────────────────────
        if (!this._complete && row < y + height) {
            const stepWidget = this._stepWidgets[this._currentIndex];
            if (stepWidget) {
                const stepHeight = height - (row - y) - 2;
                if (stepHeight > 0) {
                    stepWidget.updateRect({ x, y: row, width, height: stepHeight });
                    stepWidget.render(screen);
                }
            }
        } else if (this._complete) {
            const msg = `${caps.unicode ? '✓' : 'v'} Setup complete!`;
            const msgX = x + Math.max(0, Math.floor((width - stringWidth(msg)) / 2));
            screen.writeString(msgX, row + 2, msg, { ...attrs, bold: true });
        }

        // ── Key hints at bottom ───────────────────────
        const hintRow = y + height - 1;
        if (hintRow > row) {
            const hint = this._complete
                ? '[Enter] Continue'
                : `[Enter] Next  [Esc] Cancel  [${caps.unicode ? '←' : '<'}] Back`;
            screen.writeString(x, hintRow, truncate(hint, width), { ...attrs, dim: true });
        }
    }
}
