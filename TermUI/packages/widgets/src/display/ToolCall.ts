// ─────────────────────────────────────────────────────
// @termuijs/widgets — ToolCall and ToolApproval widgets
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type NamedColor,
    styleToCellAttrs,
    truncate,
    caps,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

// ── Types ─────────────────────────────────────────────

export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error';

export interface ToolCallOptions {
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
    status: ToolCallStatus;
    collapsed?: boolean; // default: true
}

export interface ToolApprovalOptions extends ToolCallOptions {
    onApprove?: () => void;
    onDeny?: () => void;
}

// ── Status configuration ──────────────────────────────

interface StatusConfig {
    unicodeSymbol: string;
    asciiSymbol: string;
    colorName: string;
    bold?: boolean;
    dim?: boolean;
}

const STATUS_CONFIG: Record<ToolCallStatus, StatusConfig> = {
    pending: { unicodeSymbol: '◌', asciiSymbol: '?', colorName: 'white', dim: true },
    running: { unicodeSymbol: '◎', asciiSymbol: '~', colorName: 'yellow' },
    done:    { unicodeSymbol: '✓', asciiSymbol: '+', colorName: 'green' },
    error:   { unicodeSymbol: '✗', asciiSymbol: '!', colorName: 'red' },
};

// ── ToolCall widget ───────────────────────────────────

/**
 * ToolCall — displays an AI tool invocation with status indicator,
 * tool name, arguments, and optional result.
 *
 * Layout (expanded):
 *   Row 0: ▶/▼ tool_name [status-symbol] [status-label]
 *   Row 1+: "  arg: value" (one per arg, 2-space indent)
 *   (if done/error and result present): "  result: ..."
 *
 * Space or Enter toggles collapsed/expanded state.
 */
export class ToolCall extends Widget {
    protected _name: string;
    protected _args: Record<string, unknown>;
    protected _result: unknown;
    protected _status: ToolCallStatus;
    protected _collapsed: boolean;

    constructor(options: ToolCallOptions, style: Partial<Style> = {}) {
        super(style);
        this._name = options.name;
        this._args = options.args;
        this._result = options.result;
        this._status = options.status;
        this._collapsed = options.collapsed ?? true;
        this.focusable = true;
    }

    // ── Public API ─────────────────────────────────────

    setStatus(status: ToolCallStatus): void {
        this._status = status;
        this.markDirty();
    }

    setResult(result: unknown): void {
        this._result = result;
        this.markDirty();
    }

    collapse(): void {
        this._collapsed = true;
        this.markDirty();
    }

    expand(): void {
        this._collapsed = false;
        this.markDirty();
    }

    handleKey(key: string): void {
        if (key === ' ' || key === 'Enter') {
            this._collapsed = !this._collapsed;
            this.markDirty();
        }
    }

    // ── Rendering ──────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const useUnicode = caps.unicode;
        const baseAttrs = styleToCellAttrs(this._style);
        const config = STATUS_CONFIG[this._status];

        // ── Row 0: chevron + name + status ────────────────
        const collapsedChevron = useUnicode ? '▶' : '>';
        const expandedChevron  = useUnicode ? '▼' : 'v';
        const chevron = this._collapsed ? collapsedChevron : expandedChevron;
        const symbol = useUnicode ? config.unicodeSymbol : config.asciiSymbol;

        const statusAttrs = {
            ...baseAttrs,
            fg: { type: 'named' as const, name: config.colorName as NamedColor },
            bold: config.bold ?? false,
            dim: config.dim ?? false,
        };

        // Build header line: "▶ tool_name [symbol] [status]"
        const headerText = `${chevron} ${this._name} ${symbol} [${this._status}]`;
        screen.writeString(x, y, truncate(headerText, width), baseAttrs);

        // Colorize the status symbol within the header
        const symbolOffset = chevron.length + 1 + this._name.length + 1;
        if (symbolOffset < width) {
            screen.writeString(x + symbolOffset, y, symbol, statusAttrs);
        }

        if (this._collapsed) return;

        // ── Rows 1+: args ─────────────────────────────────
        let row = 1;
        const argEntries = Object.entries(this._args);

        for (const [key, value] of argEntries) {
            if (row >= height) break;
            const argLine = `  ${key}: ${JSON.stringify(value)}`;
            screen.writeString(x, y + row, truncate(argLine, width), baseAttrs);
            row++;
        }

        // ── Result row (done/error) ───────────────────────
        if (
            row < height &&
            this._result !== undefined &&
            (this._status === 'done' || this._status === 'error')
        ) {
            const resultStr = typeof this._result === 'string'
                ? this._result
                : JSON.stringify(this._result);
            const resultLine = `  result: ${resultStr}`;
            screen.writeString(x, y + row, truncate(resultLine, width), baseAttrs);
        }
    }
}

// ── ToolApproval widget ───────────────────────────────

/**
 * ToolApproval — extends ToolCall with an approval prompt row.
 * When focused, shows "[y] Approve  [n] Deny" after the args/result.
 * y/Enter calls onApprove; n/Escape calls onDeny.
 */
export class ToolApproval extends ToolCall {
    private _onApprove?: () => void;
    private _onDeny?: () => void;

    constructor(options: ToolApprovalOptions, style: Partial<Style> = {}) {
        super(options, style);
        this._onApprove = options.onApprove;
        this._onDeny = options.onDeny;
    }

    protected _renderSelf(screen: Screen): void {
        // Render the base ToolCall first
        super._renderSelf(screen);

        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        // Calculate row after the header + args + result
        let rowsUsed = 1; // header row
        if (!this._collapsed) {
            rowsUsed += Object.keys(this._args).length;
            if (
                this._result !== undefined &&
                (this._status === 'done' || this._status === 'error')
            ) {
                rowsUsed += 1;
            }
        }

        const approvalRow = y + rowsUsed;
        if (approvalRow >= y + height) return;

        const baseAttrs = styleToCellAttrs(this._style);

        const approveAttrs = {
            ...baseAttrs,
            fg: { type: 'named' as const, name: 'green' as const },
            bold: true,
        };
        const denyAttrs = {
            ...baseAttrs,
            fg: { type: 'named' as const, name: 'red' as const },
            bold: true,
        };

        const approveText = '[y] Approve';
        const denyText = '[n] Deny';

        screen.writeString(x, approvalRow, approveText, approveAttrs);
        const denyX = x + approveText.length + 2;
        if (denyX + denyText.length <= x + width) {
            screen.writeString(denyX, approvalRow, denyText, denyAttrs);
        }
    }

    handleKey(key: string): void {
        if (key === 'y' || key === 'Enter') {
            this._onApprove?.();
        } else if (key === 'n' || key === 'Escape') {
            this._onDeny?.();
        } else {
            super.handleKey(key);
        }
    }
}
