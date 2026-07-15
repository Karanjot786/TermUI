// ─────────────────────────────────────────────────────
// @termuijs/widgets — Playground (component gallery)
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type KeyEvent,
    type Color,
    stringWidth,
    truncate,
    caps,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

/** A single component example shown in the gallery. */
export interface PlaygroundExample {
    /** Stable unique id (e.g. "gauge"). */
    id: string;
    /** Human-readable component name (e.g. "Gauge"). */
    name: string;
    /** One-line description of what the component does. */
    description: string;
    /** Category this example belongs to (e.g. "Data"). */
    category: string;
    /** Multi-line, text-based preview / ASCII diagram of the component. */
    preview: string;
    /** Optional documentation link. */
    docUrl?: string;
}

export interface PlaygroundOptions {
    /** Title shown in the header. Default: "Component Playground". */
    title?: string;
    /** Color used for the active category / selection highlight. */
    accent?: Color;
}

/**
 * Playground — a keyboard-navigable gallery of component examples.
 *
 * Displays categorized examples in a left-hand navigation menu and a live,
 * text-based preview of the selected component on the right. Navigation:
 *   left / right  — move between categories
 *   up   / down   — move between examples within a category
 *   enter         — invoke the onSelect callback for the current example
 *
 * The previews are intentionally simple text diagrams — the Playground shows
 * how a component looks, not an embedded interactive instance.
 *
 * CONSTRUCTOR: (examples, style?, opts?)
 */
export class Playground extends Widget {
    private _examples: PlaygroundExample[];
    private _categories: string[] = [];
    private _byCategory: Map<string, PlaygroundExample[]> = new Map();
    private _selectedCategory = 0;
    private _selectedExample = 0;
    private _title: string;
    private _accent: Color;

    /** Called when the user presses enter on an example. */
    onSelect?: (example: PlaygroundExample) => void;

    constructor(
        examples: PlaygroundExample[],
        style: Partial<Style> = {},
        opts: PlaygroundOptions = {},
    ) {
        super(style);
        this.focusable = true;
        this._title = opts.title ?? 'Component Playground';
        this._accent = opts.accent ?? { type: 'named', name: 'cyan' };
        this._examples = [];
        this.setExamples(examples);
    }

    /** Replace the full set of examples and rebuild the category index. */
    setExamples(examples: PlaygroundExample[]): void {
        this._examples = examples.slice();
        this._categories = [];
        this._byCategory = new Map();
        for (const ex of this._examples) {
            if (!this._byCategory.has(ex.category)) {
                this._categories.push(ex.category);
                this._byCategory.set(ex.category, []);
            }
            this._byCategory.get(ex.category)!.push(ex);
        }
        this._selectedCategory = 0;
        this._selectedExample = 0;
        this.markDirty();
    }

    /** Get all examples currently loaded. */
    getExamples(): readonly PlaygroundExample[] {
        return this._examples;
    }

    /** Get the list of category names in display order. */
    getCategories(): readonly string[] {
        return this._categories;
    }

    /** Currently selected category index. */
    getSelectedCategoryIndex(): number {
        return this._selectedCategory;
    }

    /** Currently selected example index within its category. */
    getSelectedExampleIndex(): number {
        return this._selectedExample;
    }

    /** The currently selected example, or null when empty. */
    getSelected(): PlaygroundExample | null {
        const list = this._byCategory.get(this._categories[this._selectedCategory]);
        if (!list || list.length === 0) return null;
        return list[Math.min(this._selectedExample, list.length - 1)];
    }

    /** Select a category by index (clamped to valid range). */
    selectCategory(index: number): void {
        if (this._categories.length === 0) return;
        const clamped = Math.max(0, Math.min(index, this._categories.length - 1));
        if (clamped === this._selectedCategory && this._selectedExample === 0) return;
        this._selectedCategory = clamped;
        this._selectedExample = 0;
        this.markDirty();
    }

    /** Select an example by index within the current category (clamped). */
    selectExample(index: number): void {
        const list = this._byCategory.get(this._categories[this._selectedCategory]);
        if (!list || list.length === 0) return;
        const clamped = Math.max(0, Math.min(index, list.length - 1));
        if (clamped === this._selectedExample) return;
        this._selectedExample = clamped;
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        const key = event.key;

        if (key === 'right') {
            this.selectCategory(this._selectedCategory + 1);
            return;
        }
        if (key === 'left') {
            this.selectCategory(this._selectedCategory - 1);
            return;
        }
        if (key === 'down') {
            this.selectExample(this._selectedExample + 1);
            return;
        }
        if (key === 'up') {
            this.selectExample(this._selectedExample - 1);
            return;
        }
        if (key === 'enter' || key === 'space') {
            const selected = this.getSelected();
            if (selected) this.onSelect?.(selected);
            return;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const unicode = caps.unicode;
        const tl = unicode ? '┌' : '+';
        const tr = unicode ? '┐' : '+';
        const bl = unicode ? '└' : '+';
        const br = unicode ? '┘' : '+';
        const hz = unicode ? '─' : '-';
        const vt = unicode ? '│' : '|';
        const caret = unicode ? '▶' : '>';
        const bullet = unicode ? '•' : '-';

        const accent = this._accent;
        const dim = { fg: { type: 'named' as const, name: 'brightBlack' as const } };
        const titleAttrs = { fg: accent, bold: true };

        let row = y;

        // ── Header ───────────────────────────────────────
        const hint = unicode ? '←/→ categories  ↑/↓ examples  enter open' : '<-/-> cats  up/down ex  enter open';
        const headerText = truncate(`${this._title}`, width, '');
        screen.writeString(x, row, headerText, titleAttrs);
        const hintX = x + Math.max(0, width - stringWidth(hint));
        if (width > stringWidth(headerText) + stringWidth(hint) + 1) {
            screen.writeString(hintX, row, hint, dim);
        }
        row += 1;

        // ── Category tabs ────────────────────────────────
        let catX = x;
        for (let i = 0; i < this._categories.length; i++) {
            const active = i === this._selectedCategory;
            const label = ` ${this._categories[i]} `;
            const attrs = active
                ? { fg: accent, bold: true, underline: true }
                : dim;
            screen.writeString(catX, row, label, attrs);
            catX += stringWidth(label) + 1;
            if (catX >= x + width) break;
        }
        row += 1;

        if (this._categories.length === 0) {
            screen.writeString(x, row, '(no examples)', dim);
            return;
        }

        // ── Layout: sidebar + detail ─────────────────────
        const bodyHeight = Math.max(0, y + height - row);
        const sidebarWidth = Math.max(8, Math.min(34, Math.floor(width * 0.38)));
        const detailX = x + sidebarWidth + 1;
        const detailWidth = Math.max(0, x + width - detailX);

        // Sidebar divider (vertical line)
        if (width > sidebarWidth + 1) {
            for (let r = row; r < y + height; r++) {
                screen.setCell(x + sidebarWidth, r, { char: vt, ...dim });
            }
        }

        // ── Sidebar: example list ────────────────────────
        const list = this._byCategory.get(this._categories[this._selectedCategory])!;
        for (let i = 0; i < list.length; i++) {
            const r = row + i;
            if (r >= y + height) break;
            const active = i === this._selectedExample;
            const marker = active ? `${caret} ` : `  `;
            const attrs = active ? { fg: accent, bold: true } : {};
            screen.writeString(x, r, marker, attrs);
            const nameX = x + stringWidth(marker);
            const available = sidebarWidth - stringWidth(marker);
            const nameText = truncate(list[i].name, available, '…');
            screen.writeString(nameX, r, nameText, attrs);
        }

        // ── Detail panel ─────────────────────────────────
        const selected = this.getSelected();
        if (selected && detailWidth > 2) {
            let dr = row;

            // Name
            screen.writeString(detailX, dr, truncate(selected.name, detailWidth, ''), {
                fg: accent,
                bold: true,
            });
            dr += 1;

            // Category + doc link
            const meta = selected.docUrl
                ? `Category: ${selected.category}   ${bullet} docs: ${selected.docUrl}`
                : `Category: ${selected.category}`;
            screen.writeString(detailX, dr, truncate(meta, detailWidth, ''), dim);
            dr += 1;

            // Description (wrapped)
            dr = this._renderWrapped(screen, selected.description, detailX, dr, detailWidth, bodyHeight - (dr - row), dim);
            dr += 1;

            // Preview box
            this._renderPreview(screen, selected.preview, detailX, dr, detailWidth, y + height - dr, { tl, tr, bl, br, hz, vt, accent });
        }
    }

    private _renderWrapped(
        screen: Screen,
        text: string,
        cx: number,
        startRow: number,
        maxWidth: number,
        maxRows: number,
        attrs: { fg?: Color },
    ): number {
        if (maxWidth <= 0 || maxRows <= 0) return startRow;
        const words = text.split(/\s+/).filter(Boolean);
        let row = startRow;
        let line = '';
        for (const word of words) {
            const candidate = line.length === 0 ? word : `${line} ${word}`;
            if (stringWidth(candidate) > maxWidth && line.length > 0) {
                screen.writeString(cx, row, line, attrs);
                row += 1;
                line = word;
                if (row - startRow >= maxRows) return row;
            } else {
                line = candidate;
            }
        }
        if (line.length > 0 && row - startRow < maxRows) {
            screen.writeString(cx, row, line, attrs);
            row += 1;
        }
        return row;
    }

    private _renderPreview(
        screen: Screen,
        preview: string,
        cx: number,
        startRow: number,
        maxWidth: number,
        maxHeight: number,
        chars: { tl: string; tr: string; bl: string; br: string; hz: string; vt: string; accent: Color },
    ): void {
        if (maxWidth < 4 || maxHeight < 3) return;
        const innerWidth = maxWidth - 2;
        const lines = preview.split('\n');
        const boxHeight = Math.min(maxHeight, lines.length + 2, maxHeight);
        const top = startRow;
        const left = cx;

        const borderAttrs = { fg: chars.accent };
        const labelText = ' Preview ';

        // Top border with label
        screen.setCell(left, top, { char: chars.tl, ...borderAttrs });
        let col = left + 1;
        for (const ch of labelText) {
            screen.setCell(col, top, { char: ch, ...borderAttrs });
            col += 1;
        }
        for (; col < left + maxWidth - 1; col++) {
            screen.setCell(col, top, { char: chars.hz, ...borderAttrs });
        }
        screen.setCell(left + maxWidth - 1, top, { char: chars.tr, ...borderAttrs });

        // Body lines
        const contentRows = Math.max(0, boxHeight - 2);
        for (let r = 0; r < contentRows; r++) {
            const ry = top + 1 + r;
            screen.setCell(left, ry, { char: chars.vt, ...borderAttrs });
            const src = lines[r] ?? '';
            const text = truncate(src, innerWidth, '');
            screen.writeString(left + 1, ry, text, {});
            for (let c = stringWidth(text); c < innerWidth; c++) {
                screen.setCell(left + 1 + c, ry, { char: ' ' });
            }
            screen.setCell(left + maxWidth - 1, ry, { char: chars.vt, ...borderAttrs });
        }

        // Bottom border
        const bottom = top + boxHeight - 1;
        screen.setCell(left, bottom, { char: chars.bl, ...borderAttrs });
        for (let c = left + 1; c < left + maxWidth - 1; c++) {
            screen.setCell(c, bottom, { char: chars.hz, ...borderAttrs });
        }
        screen.setCell(left + maxWidth - 1, bottom, { char: chars.br, ...borderAttrs });
    }
}
