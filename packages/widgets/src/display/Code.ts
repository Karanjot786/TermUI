// ─────────────────────────────────────────────────────
// @termuijs/widgets — Code widget
// ─────────────────────────────────────────────────────

import { caps, getBorderChars, styleToCellAttrs } from '@termuijs/core';
import { type Screen, type Style } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface CodeOptions {
    language?: string;
    showLineNumbers?: boolean;
}

export class Code extends Widget {
    private _code: string;
    private _language: string;
    private _showLineNumbers: boolean;

    constructor(code: string, style: Partial<Style> = {}, opts: CodeOptions = {}) {
        const mergedStyle: Partial<Style> = { border: 'round', ...style };
        super(mergedStyle);
        this._code = code;
        this._language = opts.language ?? '';
        this._showLineNumbers = opts.showLineNumbers ?? true;
    }

    setCode(code: string): void {
        this._code = code;
        this.markDirty();
    }

    setLanguage(language: string): void {
        this._language = language;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const lines = this._code.split('\n');
        const maxLineNum = lines.length;
        const lineNumWidth = this._showLineNumbers ? String(maxLineNum).length : 0;

        for (let i = 0; i < lines.length && i < rect.height; i++) {
            let x = rect.x;
            const y = rect.y + i;

            if (this._showLineNumbers && lineNumWidth > 0) {
                const lineNum = String(i + 1).padStart(lineNumWidth);
                screen.writeString(x, y, lineNum, { dim: true });
                x += lineNumWidth;

                screen.setCell(x, y, { char: '│', dim: true });
                x++;

                screen.setCell(x, y, { char: ' ' });
                x++;
            }

            const codeLine = lines[i];
            screen.writeString(x, y, codeLine);
        }
    }

    protected _renderBorder(screen: Screen): void {
        const border = this._style.border;
        const hasBorder = border && border !== 'none';
        if (!hasBorder) return;

        const { x, y, width, height } = this._rect;
        if (width < 2 || height < 2) return;

        const chars = getBorderChars(border);
        if (!chars) return;

        const attrs = styleToCellAttrs(this._style);
        const borderFg = this._style.borderColor ?? attrs.fg;
        const cellStyle = { fg: borderFg };

        // Top edge with language label
        const availableLabelWidth = width - 3;
        const label = this._language && availableLabelWidth > 0
            ? `[${this._language}]`.slice(0, availableLabelWidth)
            : '';

        screen.setCell(x, y, { char: chars.topLeft, ...cellStyle });

        if (label) {
            screen.setCell(x + 1, y, { char: chars.top, ...cellStyle });
            for (let i = 0; i < label.length; i++) {
                screen.setCell(x + 2 + i, y, { char: label[i], ...cellStyle, bold: true });
            }
            for (let c = 2 + label.length; c < width - 1; c++) {
                screen.setCell(x + c, y, { char: chars.top, ...cellStyle });
            }
        } else {
            for (let c = 1; c < width - 1; c++) {
                screen.setCell(x + c, y, { char: chars.top, ...cellStyle });
            }
        }
        screen.setCell(x + width - 1, y, { char: chars.topRight, ...cellStyle });

        // Bottom edge
        screen.setCell(x, y + height - 1, { char: chars.bottomLeft, ...cellStyle });
        for (let c = 1; c < width - 1; c++) {
            screen.setCell(x + c, y + height - 1, { char: chars.bottom, ...cellStyle });
        }
        screen.setCell(x + width - 1, y + height - 1, { char: chars.bottomRight, ...cellStyle });

        // Left and right edges
        for (let r = 1; r < height - 1; r++) {
            screen.setCell(x, y + r, { char: chars.left, ...cellStyle });
            screen.setCell(x + width - 1, y + r, { char: chars.right, ...cellStyle });
        }
    }
}
