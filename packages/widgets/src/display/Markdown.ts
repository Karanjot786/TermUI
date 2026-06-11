// ─────────────────────────────────────────────────────
// @termuijs/widgets — Markdown widget
// ─────────────────────────────────────────────────────

import { Screen, Style, caps, wordWrap } from '@termuijs/core';
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
 */

export class Markdown extends Widget {
    private _content: string;

    private writeText(
        screen: Screen,
        x: number,
        y: number,
        text: string,
        attrs: Record<string, unknown> = {}
    ): void {
        for (let i = 0; i < text.length && x + i < this._getContentRect().x + this._getContentRect().width; i++) {
            screen.setCell(x + i, y, {
                char: text[i],
                ...attrs
            });
        }
    }

    private renderInline(screen: Screen, x: number, y: number, text: string): void {
        text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '$1 ($2)'
);
    let bold = false;
    let italic = false;
    let code = false;
    let col = x;
    let segment = '';

    const flush = () => {
        if (segment.length === 0) return;
        screen.writeString(col - segment.length, y, segment, {
            bold,
            italic,
            inverse: code
        });
        segment = '';
    };

    for (let i = 0; i < text.length; i++) {
        if (text.slice(i, i + 2) === '**') {
            flush();
            bold = !bold;
            i++;
            continue;
        }
        if (text[i] === '_') {
            flush();
            italic = !italic;
            continue;
        }
        if (text[i] === '`') {
            flush();
            code = !code;
            continue;
        }
        segment += text[i];
        col++;
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

            if (line.startsWith('# ')) {
                screen.writeString(rect.x, rect.y + screenRow, line.slice(2), {
                    bold: true,
                    underline: true
                });
                screenRow++;
            }

            else if (line.startsWith('> ')) {
    screen.writeString(
        rect.x,
        rect.y + screenRow,
        `│ ${line.slice(2)}`,
        {
            italic: true
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
