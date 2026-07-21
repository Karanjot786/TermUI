// ─────────────────────────────────────────────────────
// @termuijs/widgets — Accordion widget
//
// A group of collapsible sections. By default only one
// section can be open at a time. Set multiple: true to
// allow several open sections simultaneously.
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type KeyEvent,
    styleToCellAttrs,
    truncate,
    caps,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface AccordionSection {
    /** Section header title */
    title: string;
    /** Section body content (may contain newlines) */
    content: string;
}

export interface AccordionOptions {
    /** Allow multiple sections open at once. Default: false */
    multiple?: boolean;
    /** Index of the initially open section. Default: 0 */
    openIndex?: number;
    /** Expand indicator char. Default: '▶' (or '>' in ASCII) */
    expandChar?: string;
    /** Collapse indicator char. Default: '▼' (or 'v' in ASCII) */
    collapseChar?: string;
    /** Callback fired when a section is toggled */
    onToggle?: (index: number, open: boolean) => void;
}

/**
 * Accordion — a group of collapsible sections.
 *
 * Renders each section as:
 *   Row 0: [indicator] [title]
 *   Rows 1+: content lines indented by 2 spaces (if section is open)
 *
 * Press Enter or Space to toggle the focused section.
 * Press up/down arrow keys to move between sections.
 *
 * @example
 * const accordion = new Accordion([
 *   { title: 'System Info', content: 'CPU: 45%\nRAM: 2.1 GB' },
 *   { title: 'Network',     content: 'eth0: 192.168.1.1' },
 * ]);
 */
export class Accordion extends Widget {
    private _sections: AccordionSection[];
    private _openSet: Set<number>;
    private _multiple: boolean;
    private _expandChar: string;
    private _collapseChar: string;
    private _onToggle?: (index: number, open: boolean) => void;
    private _focusedIndex: number = 0;

    constructor(
        sections: AccordionSection[],
        style: Partial<Style> = {},
        opts: AccordionOptions = {},
    ) {
        super(style);
        this.focusable = true;

        this._sections = sections;
        this._multiple = opts.multiple ?? false;
        this._expandChar = opts.expandChar ?? (caps.unicode ? '▶' : '>');
        this._collapseChar = opts.collapseChar ?? (caps.unicode ? '▼' : 'v');
        this._onToggle = opts.onToggle;

        // Initialise open set
        this._openSet = new Set();
        if (sections.length > 0) {
            const idx = opts.openIndex ?? 0;
            if (idx >= 0 && idx < sections.length) {
                this._openSet.add(idx);
            }
        }

        this._updateHeight();
    }

    // ── Public API ──────────────────────────────────────────────────────

    /** Open a section by index. No-op if already open or index out of bounds. */
    open(index: number): void {
        if (index < 0 || index >= this._sections.length) return;
        if (this._openSet.has(index)) return;
        if (!this._multiple) {
            // Fire onToggle for all sections being implicitly closed
            for (const idx of this._openSet) {
                this._onToggle?.(idx, false);
            }
            this._openSet.clear();
        }
        this._openSet.add(index);
        this._updateHeight();
        this._onToggle?.(index, true);
        this.markDirty();
    }

    /** Close a section by index. No-op if already closed. */
    close(index: number): void {
        if (!this._openSet.has(index)) return;
        this._openSet.delete(index);
        this._updateHeight();
        this._onToggle?.(index, false);
        this.markDirty();
    }

    /** Toggle a section open or closed by index. */
    toggle(index: number): void {
        if (this._openSet.has(index)) {
            this.close(index);
        } else {
            this.open(index);
        }
    }

    /** Returns true if the section at the given index is open. */
    isOpen(index: number): boolean {
        return this._openSet.has(index);
    }

    /** Returns the index of the currently keyboard-focused section. */
    getFocusedIndex(): number {
        return this._focusedIndex;
    }

    /** Replace all sections and reset open/focus state. */
    setSections(sections: AccordionSection[]): void {
        this._sections = sections;
        this._openSet.clear();
        if (sections.length > 0) this._openSet.add(0);
        this._focusedIndex = 0;
        this._updateHeight();
        this.markDirty();
    }

    /** Get the current list of sections. */
    getSections(): AccordionSection[] {
        return this._sections;
    }

    // ── Keyboard ────────────────────────────────────────────────────────

    /**
     * Handle a key event. Call this from your app's key-routing logic
     * when this widget is focused.
     */
    handleKey(event: KeyEvent): void {
        switch (event.key.toLowerCase()) {
            case 'enter':
            case ' ':
            case 'space':
                this.toggle(this._focusedIndex);
                break;
            case 'arrowup':
            case 'up':
                if (this._focusedIndex > 0) {
                    this._focusedIndex--;
                    this.markDirty();
                }
                break;
            case 'arrowdown':
            case 'down':
                if (this._focusedIndex < this._sections.length - 1) {
                    this._focusedIndex++;
                    this.markDirty();
                }
                break;
        }
    }

    // ── Render ──────────────────────────────────────────────────────────

    /** Render all sections with their open/closed state. */
    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        let row = 0;

        for (let i = 0; i < this._sections.length; i++) {
            if (row >= height) break;

            const section = this._sections[i];
            const open = this._openSet.has(i);
            const focused = i === this._focusedIndex;

            // Title row
            const indicator = open ? this._collapseChar : this._expandChar;
            const titleLine = indicator + ' ' + section.title;
            const titleAttrs = focused
                ? { ...attrs, bold: true }
                : attrs;
            screen.writeString(x, y + row, truncate(titleLine, width), titleAttrs);
            row++;

            // Content rows (if open)
            if (open) {
                const lines = section.content.split('\n');
                for (const line of lines) {
                    if (row >= height) break;
                    screen.writeString(
                        x,
                        y + row,
                        truncate('  ' + line, width),
                        attrs,
                    );
                    row++;
                }
            }
        }
    }

    // ── Private ─────────────────────────────────────────────────────────

    /** Recalculate total height based on open sections. */
    private _updateHeight(): void {
        let total = this._sections.length; // one title row per section
        for (let i = 0; i < this._sections.length; i++) {
            if (this._openSet.has(i)) {
                total += this._sections[i].content.split('\n').length;
            }
        }
        this._style.height = total;
    }
}