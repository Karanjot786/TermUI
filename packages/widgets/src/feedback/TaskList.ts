// ─────────────────────────────────────────────────────
// @termuijs/widgets — TaskList widget
// Renders a list of tasks with status indicators.
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

// ── Types ────────────────────────────────────────────

export type TaskStatus = 'pending' | 'running' | 'done' | 'error';

export interface TaskItem {
    id: string | number;
    label: string;
    status: TaskStatus;
}

export interface TaskListOptions {
    pendingText?: string;
    runningText?: string;
    doneText?: string;
    errorText?: string;
    /** When true, the running indicator animates with a spinner. */
    wheelspin?: boolean;
}

// ── Spinner frames ────────────────────────────────────

/** Braille dot spinner — used when caps.unicode is true. */
const SPINNER_FRAMES_UNICODE = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** ASCII fallback — used when caps.unicode is false. */
const SPINNER_FRAMES_ASCII = ['|', '/', '-', '\\'];

const SPINNER_INTERVAL = 80;

// ── Widget ───────────────────────────────────────────

/**
 * TaskList — a vertical list of tasks with status indicators.
 *
 * Each task renders on its own row:
 *   Build      ⠋        ← running + wheelspin + unicode
 *   Lint       ...      ← pending (default pendingText)
 *   Tests      ✓        ← done (custom doneText)
 *   Deploy     ✗        ← error (custom errorText)
 */
export class TaskList extends Widget {
    private _tasks: TaskItem[];
    private _pendingText: string;
    private _runningText: string;
    private _doneText: string;
    private _errorText: string;
    private _wheelspin: boolean;

    private _frameIndex = 0;
    private _elapsed = 0;

    constructor(
        style: Partial<Style> = {},
        options: TaskListOptions = {},
        tasks: TaskItem[] = [],
    ) {
        super(style);
        this._tasks = tasks;
        this._pendingText = options.pendingText ?? '...';
        this._runningText = options.runningText ?? '...';
        this._doneText = options.doneText ?? '...';
        this._errorText = options.errorText ?? '...';
        this._wheelspin = options.wheelspin ?? false;
    }

    /** Replace the task list and schedule a re-render. */
    setTasks(tasks: TaskItem[]): void {
        if (tasks === this._tasks) {
            return;
        }
        this._tasks = tasks;
        this.markDirty();
    }

    /**
     * Advance the spinner animation by `dt` milliseconds.
     * Only has an effect when `wheelspin` is enabled and there is at least
     * one running task. Call this from the app's render/tick loop.
     */
    tick(dt: number): void {
        if (!this._wheelspin) return;

        const hasRunning = this._tasks.some(t => t.status === 'running');
        if (!hasRunning) return;

        this._elapsed += dt;
        if (this._elapsed >= SPINNER_INTERVAL) {
            const frames = caps.unicode ? SPINNER_FRAMES_UNICODE : SPINNER_FRAMES_ASCII;
            const steps = Math.floor(this._elapsed / SPINNER_INTERVAL);
            this._frameIndex = (this._frameIndex + steps) % frames.length;
            this._elapsed %= SPINNER_INTERVAL;
            this.markDirty();
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this.rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const frames = caps.unicode ? SPINNER_FRAMES_UNICODE : SPINNER_FRAMES_ASCII;

        this._tasks.forEach((task, index) => {
            if (index >= height) return;

            let indicator: string;
            switch (task.status) {
                case 'pending': indicator = this._pendingText; break;
                case 'running': indicator = this._wheelspin
                    ? (frames[this._frameIndex] ?? frames[0])
                    : this._runningText;
                    break;
                case 'done':    indicator = this._doneText;   break;
                case 'error':   indicator = this._errorText;  break;
            }

            const rowText = `${task.label} ${indicator}`;
            screen.writeString(x, y + index, rowText.substring(0, width), attrs);
        });
    }
}
