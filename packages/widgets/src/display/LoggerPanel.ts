// ─────────────────────────────────────────────────────
// @termuijs/widgets — LoggerPanel widget
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    styleToCellAttrs,
    truncate,
} from '@termuijs/core';

import { Widget } from '../base/Widget.js';

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface LogEntry {
    level: LogLevel;
    message: string;
}

export interface LoggerPanelOptions {
    logs?: LogEntry[];
    /** Maximum number of log entries retained; oldest entries are evicted past this. Default 1000. */
    maxEntries?: number;
}

const DEFAULT_MAX_ENTRIES = 1000;

export class LoggerPanel extends Widget {
    private _logs: LogEntry[];
    private _maxEntries: number;

    constructor(
        style: Partial<Style> = {},
        options: LoggerPanelOptions = {},
    ) {
        super({
            border: 'single',
            ...style,
        });

        this._maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
        this._logs = options.logs ?? [];
    }

    addLog(level: LogLevel, message: string): void {
        this._logs.push({ level, message });

        if (this._logs.length > this._maxEntries) {
            this._logs.splice(0, this._logs.length - this._maxEntries);
        }

        this.markDirty();
    }

    clear(): void {
        this._logs = [];
        this.markDirty();
    }

    getLogs(): LogEntry[] {
        return this._logs;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        const visibleLogs = this._logs.slice(-height);

        visibleLogs.forEach((log, index) => {
            const line = `[${log.level.toUpperCase()}] ${log.message}`;

            screen.writeString(
                x,
                y + index,
                truncate(line, width),
                attrs,
            );
        });
    }
}