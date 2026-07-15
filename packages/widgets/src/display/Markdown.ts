// ─────────────────────────────────────────────────────
// @termuijs/widgets — Markdown widget
// ─────────────────────────────────────────────────────

import { Screen, Style, caps, wordWrap, stringWidth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface MarkdownOptions {
    content: string;
}

// ── Markdown widget ──────────────────────────────────

/**
 * Markdown — renders a subset of Markdown syntax in the terminal.
 *
 * Supported:
 * - Headings (#)
 * - Bold (**text**)
 * - Italic (_text_)
 * - Inline code (`code`)
 * - Unordered lists (- item)
 * - Ordered lists (1. item)
 * - Code fences (```lang)
 * - Blockquotes (> text)
 * - Tables (pipe-delimited)
 * - Links ([text](url))
 */

const segmenter = new Intl.Segmenter();

export class Markdown extends Widget {
    private _content: string;

    private writeText(
        screen: Screen,
        x: number,
        y: number,
        text: string,
        attrs: Record<string, unknown> = {}
    ): void {
        screen.writeString(x, y, text, attrs);
    }

    private renderInline(screen: Screen, x: number, y: number, text: string): void {
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
        let bold = false;
        let italic = false;
        let code = false;
        let col = x;
        let segmentStr = '';

        const flush = () => {
            if (segmentStr.length === 0) return;
            screen.writeString(col - stringWidth(segmentStr), y, segmentStr, {
                bold,
                italic,
                inverse: code
            });
            segmentStr = '';
        };

        const segments = segmenter.segment(text);
        const segmentsArray = Array.from(segments);

        for (let i = 0; i < segmentsArray.length; i++) {
            const seg = segmentsArray[i].segment;
            
            if (seg === '*' && i + 1 < segmentsArray.length && segmentsArray[i+1].segment === '*') {
                flush();
                bold = !bold;
                i++;
                continue;
            }
            if (seg === '_') {
                flush();
                italic = !italic;
                continue;
            }
            if (seg === '`') {
                flush();
                code = !code;
                continue;
            }
            segmentStr += seg;
            col += stringWidth(seg);
        }
        flush();
    }
    private renderCodeBlock(
        screen: Screen,
        x: number,
        y: number,
        width: number,
        language: string,
        lines: string[]
    ): number {
        const tl = caps.unicode ? '┌' : '+';
        const tr = caps.unicode ? '┐' : '+';
        const hl = caps.unicode ? '─' : '-';
        const vl = caps.unicode ? '│' : '|';
        const bl = caps.unicode ? '└' : '+';
        const br = caps.unicode ? '┘' : '+';
        const top = `${tl}${hl} ${language} ${hl.repeat(Math.max(0, width - language.length - 5))}${tr}`;

        this.writeText(screen, x, y, top);

        for (let i = 0; i < lines.length; i++) {
            this.writeText(
                screen,
                x,
                y + i + 1,
                `${vl} ${lines[i]}`
            );
        }

        const bottom = `${bl}${hl.repeat(Math.max(0, width - 2))}${br}`;

        this.writeText(
            screen,
            x,
            y + lines.length + 1,
            bottom
        );

        return lines.length + 2;
    }

    private renderTable(
        screen: Screen,
        x: number,
        y: number,
        width: number,
        headers: string[],
        rows: string[][]
    ): number {
        const vl = caps.unicode ? '│' : '|';
        const hl = caps.unicode ? '─' : '-';
        const cross = caps.unicode ? '┼' : '+';
        const tl = caps.unicode ? '┌' : '+';
        const tr = caps.unicode ? '┐' : '+';
        const bl = caps.unicode ? '└' : '+';
        const br = caps.unicode ? '┘' : '+';

        const colCount = headers.length;
        const colWidths = headers.map(h => Math.max(stringWidth(h), 3));
        const pad = 1;
        const totalWidth = colCount * (colWidths.reduce((a, b) => a + b, 0) + (colCount - 1) * 3 + 2);

        const renderRow = (cells: string[], isHeader: boolean): string => {
            let row = vl + ' ';
            for (let i = 0; i < colCount; i++) {
                const cell = (cells[i] ?? '').slice(0, colWidths[i]);
                const padded = cell.padEnd(colWidths[i]);
                row += padded + ' ' + vl + ' ';
            }
            return row;
        };

        const renderSep = (): string => {
            let sep = '';
            for (let i = 0; i < colCount; i++) {
                if (i > 0) sep += cross + hl.repeat(3);
                sep += hl.repeat(colWidths[i] + 2);
            }
            return sep;
        };

        let screenRow = 0;
        const topBorder = tl + renderSep().slice(1) + tr;
        this.writeText(screen, x, y + screenRow, topBorder);
        screenRow++;

        this.writeText(screen, x, y + screenRow, renderRow(headers, true));
        screenRow++;

        this.writeText(screen, x, y + screenRow, cross + renderSep().slice(1) + cross);
        screenRow++;

        for (const row of rows) {
            this.writeText(screen, x, y + screenRow, renderRow(row, false));
            screenRow++;
        }

        const bottomBorder = bl + renderSep().slice(1) + br;
        this.writeText(screen, x, y + screenRow, bottomBorder);
        screenRow++;

        return screenRow;
    }

    constructor(options: MarkdownOptions, style: Partial<Style> = {}) {
        super(style);
        this._content = options.content;
    }

    /** Update markdown content and mark dirty. */

    setContent(content: string): void {
        this._content = content;
        this.markDirty();
    }

    getContent(): string {
        return this._content;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();

        const lines = this._content.split('\n');

        let screenRow = 0;

        for (let row = 0; row < lines.length && row < rect.height; row++) {
            const line = lines[row];

            if (line.startsWith('```')) {
                const language = line.slice(3).trim();

                const codeLines: string[] = [];

                row++;
                screenRow++;

                while (
                    row < lines.length &&
                    !lines[row].startsWith('```')
                ) {
                    codeLines.push(lines[row]);
                    row++;
                }

                screenRow += this.renderCodeBlock(
                    screen,
                    rect.x,
                    rect.y + screenRow,
                    rect.width,
                    language,
                    codeLines
                );

                continue;
            }

            if (line.startsWith('|') && line.endsWith('|')) {
                const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());
                if (cells.every(c => c.match(/^[-:]+$/))) {
                    continue;
                }
                const headers = cells;
                const dataRows: string[][] = [];
                row++;
                while (row < lines.length && lines[row].startsWith('|') && lines[row].endsWith('|')) {
                    const rowCells = lines[row].split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());
                    dataRows.push(rowCells);
                    row++;
                }
                screenRow += this.renderTable(screen, rect.x, rect.y + screenRow, rect.width, headers, dataRows);
                continue;
            }

            if (line.startsWith('# ')) {
                screen.writeString(rect.x, rect.y + screenRow, line.slice(2), {
                    bold: true,
                    underline: true
                });
                screenRow++;
            }

            else if (line.startsWith('## ')) {
                screen.writeString(rect.x, rect.y + screenRow, line.slice(3), {
                    bold: true,
                    underline: true
                });
                screenRow++;
            }

            else if (line.startsWith('### ')) {
                screen.writeString(rect.x, rect.y + screenRow, line.slice(4), {
                    bold: true
                });
                screenRow++;
            }

            else if (line.startsWith('> ')) {
                const quote = line.slice(2);
                screen.writeString(
                    rect.x,
                    rect.y + screenRow,
                    `│ ${quote}`,
                    {
                        italic: true,
                        dim: true
                    }
                );
                screenRow++;
            }
            else if (line.startsWith('- ')) {
                const bullet = caps.unicode ? '•' : '*';

                this.renderInline(
                    screen,
                    rect.x,
                    rect.y + screenRow,
                    `${bullet} ${line.slice(2)}`
                );
                screenRow++;
            }
            else if (/^\d+\.\s/.test(line)) {
                this.renderInline(
                    screen,
                    rect.x,
                    rect.y + screenRow,
                    line
                );
                screenRow++;
            }
            else {
                const wrapped = wordWrap(line, rect.width);

                const wrappedLines = wrapped.split('\n');

                for (let i = 0; i < wrappedLines.length; i++) {
                    if (row + i >= rect.height) break;

                    this.renderInline(
                        screen,
                        rect.x,
                        rect.y + screenRow + i,
                        wrappedLines[i]
                    );
                }
                screenRow += wrappedLines.length;
            }
        }
    }
}
