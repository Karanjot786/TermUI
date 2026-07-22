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
    content?: string;
    /** Nested accordion sections for hierarchical content */
    sections?: AccordionSection[];
    /** Icon override for this section's expand/collapse indicator */
    icon?: string;
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
    private _nestedOpenSets: Map<number, Set<number>> = new Map();
    private _multiple: boolean;
    private _expandChar: string;
    private _collapseChar: string;
    private _onToggle?: (index: number, open: boolean) => void;
    private _focusedIndex: number = 0;
    private _animating: boolean = false;

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

        // Initialise nested open sets
        for (let i = 0; i < sections.length; i++) {
            if (sections[i].sections && sections[i].sections!.length > 0) {
                this._nestedOpenSets.set(i, new Set([0]));
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

    /** Returns true if a nested accordion section is open. */
    isNestedOpen(parentIndex: number, childIndex: number): boolean {
        const nestedSet = this._nestedOpenSets.get(parentIndex);
        return nestedSet ? nestedSet.has(childIndex) : false;
    }

    /** Toggle a nested accordion section. */
    toggleNested(parentIndex: number, childIndex: number): void {
        const nestedSet = this._nestedOpenSets.get(parentIndex);
        if (!nestedSet) return;
        const section = this._sections[parentIndex];
        if (!section.sections || childIndex < 0 || childIndex >= section.sections!.length) return;
        if (nestedSet.has(childIndex)) {
            nestedSet.delete(childIndex);
        } else {
            nestedSet.add(childIndex);
        }
        this._updateHeight();
        this.markDirty();
    }

    /** Open a nested accordion section. */
    openNested(parentIndex: number, childIndex: number): void {
        const nestedSet = this._nestedOpenSets.get(parentIndex);
        if (!nestedSet) return;
        const section = this._sections[parentIndex];
        if (!section.sections || childIndex < 0 || childIndex >= section.sections!.length) return;
        nestedSet.add(childIndex);
        this._updateHeight();
        this.markDirty();
    }

    /** Close a nested accordion section. */
    closeNested(parentIndex: number, childIndex: number): void {
        const nestedSet = this._nestedOpenSets.get(parentIndex);
        if (!nestedSet) return;
        nestedSet.delete(childIndex);
        this._updateHeight();
        this.markDirty();
    }

    /** Get the nested open set for a parent section. */
    getNestedOpenSet(parentIndex: number): Set<number> {
        return this._nestedOpenSets.get(parentIndex) ?? new Set();
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
        const key = event.key.toLowerCase();
        const section = this._sections[this._focusedIndex];
        const hasNested = section?.sections && section.sections!.length > 0;

        switch (key) {
            case 'enter':
            case ' ':
            case 'space':
                if (hasNested && this._openSet.has(this._focusedIndex)) {
                    const nestedSet = this._nestedOpenSets.get(this._focusedIndex);
                    if (nestedSet && nestedSet.size > 0) {
                        const firstNested = [...nestedSet][0];
                        this.toggleNested(this._focusedIndex, firstNested);
                        break;
                    }
                }
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
            case 'arrowright':
            case 'right':
                if (hasNested && !this._openSet.has(this._focusedIndex)) {
                    this.open(this._focusedIndex);
                }
                break;
            case 'arrowleft':
            case 'left':
                if (hasNested && this._openSet.has(this._focusedIndex)) {
                    this.close(this._focusedIndex);
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
            const hasNested = !!section.sections && section.sections!.length > 0;

            // Title row
            const indicator = open ? this._collapseChar : this._expandChar;
            const sectionIcon = section.icon ? ` ${section.icon}` : '';
            const titleLine = indicator + sectionIcon + ' ' + section.title;
            const titleAttrs = focused
                ? { ...attrs, bold: true }
                : attrs;
            screen.writeString(x, y + row, truncate(titleLine, width), titleAttrs);
            row++;

            // Content rows (if open)
            if (open && section.content) {
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

            // Nested accordion rows (if open)
            if (open && hasNested) {
                const nestedSet = this._nestedOpenSets.get(i) ?? new Set();
                const nestedSections = section.sections!;
                for (let j = 0; j < nestedSections.length; j++) {
                    if (row >= height) break;
                    const nestedOpen = nestedSet.has(j);
                    const nestedIndicator = nestedOpen ? this._collapseChar : this._expandChar;
                    const nestedLine = '  ' + nestedIndicator + ' ' + nestedSections[j].title;
                    screen.writeString(x, y + row, truncate(nestedLine, width), attrs);
                    row++;

                    if (nestedOpen && nestedSections[j].content) {
                        const nestedLines = nestedSections[j].content!.split('\n');
                        for (const line of nestedLines) {
                            if (row >= height) break;
                            screen.writeString(
                                x,
                                y + row,
                                truncate('    ' + line, width),
                                attrs,
                            );
                            row++;
                        }
                    }
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
                if (this._sections[i].content) {
                    total += this._sections[i].content!.split('\n').length;
                }
                if (this._sections[i].sections) {
                    total += this._sections[i].sections!.length;
                    const nestedSet = this._nestedOpenSets.get(i);
                    if (nestedSet) {
                        for (const j of nestedSet) {
                            if (this._sections[i].sections![j].content) {
                                total += this._sections[i].sections![j].content!.split('\n').length;
                            }
                        }
                    }
                }
            }
        }
        this._style.height = total;
    }

    /** Trigger a simple animation frame for the focused section. */
    animateToggle(index: number): void {
        if (index < 0 || index >= this._sections.length) return;
        this._animating = true;
        this.toggle(index);
        setTimeout(() => {
            this._animating = false;
            this.markDirty();
        }, 150);
        this.markDirty();
    }
}