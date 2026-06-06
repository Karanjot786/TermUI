// ─────────────────────────────────────────────────────
// @termuijs/widgets — CommandPalette widget
//
// A fuzzy-search overlay widget. Shows a floating box
// with a text input and a filtered list of commands.
//
// Usage:
//   const palette = new CommandPalette({
//       commands: [
//           { id: 'open', label: 'Open File', description: 'Ctrl+O', action: () => {} },
//       ],
//       onClose: () => palette.setStyle({ visible: false }),
//   });
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, stringWidth, truncate } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface Command {
    id: string;
    label: string;
    description?: string;
    action: () => void;
}

export interface CommandPaletteOptions {
    commands: Command[];
    onClose?: () => void;
    /** Placeholder shown when query is empty. Default: 'Type to search...' */
    placeholder?: string;
    /** Max number of commands shown at once. Default: 8 */
    maxVisible?: number;
}

/**
 * CommandPalette — a fuzzy-search overlay widget.
 *
 * Renders a floating panel with:
 * - Row 0: `> ` + query text (or placeholder when empty)
 * - Rows 1..N: filtered command list with label + description
 *
 * Key bindings:
 * - Printable chars: append to query
 * - Backspace: delete last query character
 * - ArrowUp / k: move selection up
 * - ArrowDown / j: move selection down
 * - Enter: execute selected command
 * - Escape: call onClose
 */
export class CommandPalette extends Widget {
    private _commands: Command[];
    private _filtered: Command[];
    private _query = '';
    private _selectedIndex = 0;
    private _options: CommandPaletteOptions;

    constructor(options: CommandPaletteOptions, style: Partial<Style> = {}) {
        super({ border: 'single', ...style });
        this._options = {
            placeholder: 'Type to search...',
            maxVisible: 8,
            ...options,
        };
        this._commands = options.commands;
        this._filtered = [...this._commands];
        this.focusable = true;
    }

    /** Update the full command list and re-filter. */
    setCommands(commands: Command[]): void {
        this._commands = commands;
        this._filter();
        this.markDirty();
    }

    /**
     * Reset query, re-filter all commands, reset selection.
     * Call this when opening the palette.
     */
    open(): void {
        this._query = '';
        this._selectedIndex = 0;
        this._filtered = [...this._commands];
        this.markDirty();
    }

    /** Current query string. */
    getQuery(): string {
        return this._query;
    }

    // ─── Private helpers ────────────────────────────────

    /** Filter commands based on current query (case-insensitive substring). */
    private _filter(): void {
        const q = this._query.toLowerCase();
        if (q === '') {
            this._filtered = [...this._commands];
        } else {
            this._filtered = this._commands.filter(
                (cmd) =>
                    cmd.label.toLowerCase().includes(q) ||
                    cmd.id.toLowerCase().includes(q),
            );
        }
        // Clamp selection to new filtered length
        const max = Math.max(0, this._filtered.length - 1);
        this._selectedIndex = Math.min(this._selectedIndex, max);
    }

    private _executeSelected(): void {
        const cmd = this._filtered[this._selectedIndex];
        if (cmd) {
            cmd.action();
        }
    }

    private _moveUp(): void {
        if (this._selectedIndex > 0) {
            this._selectedIndex--;
        }
    }

    private _moveDown(): void {
        const maxVisible = this._options.maxVisible ?? 8;
        const visibleCount = Math.min(this._filtered.length, maxVisible);
        if (this._selectedIndex < visibleCount - 1) {
            this._selectedIndex++;
        }
    }

    // ─── Key handling ────────────────────────────────────

    handleKey(key: string): void {
        switch (key) {
            case 'escape':
                this._options.onClose?.();
                break;
            case 'enter':
                this._executeSelected();
                break;
            case 'up':
            case 'k':
                this._moveUp();
                break;
            case 'down':
            case 'j':
                this._moveDown();
                break;
            case 'backspace':
                this._query = this._query.slice(0, -1);
                this._filter();
                break;
            default:
                if (key.length === 1) {
                    this._query += key;
                    this._filter();
                }
                break;
        }
        this.markDirty();
    }

    // ─── Rendering ───────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const maxVisible = this._options.maxVisible ?? 8;
        const placeholder = this._options.placeholder ?? 'Type to search...';

        // ── Row 0: query line ──────────────────────────
        const prefix = '> ';
        const queryDisplay = this._query.length > 0 ? this._query : placeholder;
        const queryDim = this._query.length === 0;
        const queryLine = truncate(prefix + queryDisplay, width);

        screen.writeString(x, y, queryLine, { ...attrs, dim: queryDim });

        // Fill rest of query row with spaces (clean background)
        const queryLineWidth = stringWidth(queryLine);
        for (let c = queryLineWidth; c < width; c++) {
            screen.setCell(x + c, y, { char: ' ', ...attrs });
        }

        // ── Rows 1..N: command list ────────────────────
        const listStartRow = 1;
        const listHeight = height - listStartRow;
        const visibleCount = Math.min(this._filtered.length, maxVisible, listHeight);

        for (let i = 0; i < visibleCount; i++) {
            const cmd = this._filtered[i];
            const isSelected = i === this._selectedIndex;
            const rowY = y + listStartRow + i;

            // Compose left part: prefix + label
            const rowPrefix = isSelected ? '▸ ' : '  ';
            const labelPart = rowPrefix + cmd.label;

            // Compose right part: description (dim, right-aligned)
            const desc = cmd.description ?? '';
            const descWidth = stringWidth(desc);

            // Available width for label (leave room for desc if it fits)
            const gap = 1; // minimum space between label and desc
            const labelMaxWidth = desc
                ? Math.max(0, width - descWidth - gap)
                : width;

            const labelTruncated = truncate(labelPart, labelMaxWidth);
            const labelWidth = stringWidth(labelTruncated);

            // Cell style for the row
            const cellStyle = {
                ...attrs,
                bold: isSelected,
                inverse: isSelected,
            };
            const dimStyle = {
                ...attrs,
                dim: true,
                inverse: isSelected,
            };

            // Write label
            screen.writeString(x, rowY, labelTruncated, cellStyle);

            // Fill gap between label and description
            if (desc) {
                const descX = x + width - descWidth;
                // Fill blank between label end and desc start
                for (let c = x + labelWidth; c < descX; c++) {
                    screen.setCell(c, rowY, { char: ' ', ...cellStyle });
                }
                // Write description (right-aligned, dim)
                screen.writeString(descX, rowY, desc, dimStyle);
            } else {
                // Fill remainder of row for inverse highlight
                for (let c = x + labelWidth; c < x + width; c++) {
                    screen.setCell(c, rowY, { char: ' ', ...cellStyle });
                }
            }
        }

        // Clear any rows below the visible commands (in case widget was larger)
        for (let i = visibleCount; i < listHeight; i++) {
            const rowY = y + listStartRow + i;
            for (let c = 0; c < width; c++) {
                screen.setCell(x + c, rowY, { char: ' ', ...attrs });
            }
        }
    }
}
