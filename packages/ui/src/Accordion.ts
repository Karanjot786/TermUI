// ─────────────────────────────────────────────────────
// @termuijs/ui — Accordion widget
//
// A collapsible vertical section widget with keyboard focus,
// support for single/multi-open modes, and toggle event fires.
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps
} from '@termuijs/core';

export interface AccordionItem {
    title: string;
    body: string;
}

export interface AccordionOptions {
    /** Allow multiple sections open at once. Default: false (one at a time) */
    multi?: boolean;
    onToggle?: (index: number, open: boolean) => void;
}

export class Accordion extends Widget {
    private _items: AccordionItem[] = [];
    private _multi = false;
    private _onToggle?: (index: number, open: boolean) => void;
    private _focusIndex = 0;
    private _openSet: Set<number> = new Set();

    focusable = true;

    constructor(items: AccordionItem[], style: Partial<Style> = {}, opts: AccordionOptions = {}) {
        super(mergeStyles(defaultStyle(), style));
        this._items = items;
        this._multi = opts?.multi ?? false;
        this._onToggle = opts?.onToggle;
    }

    setItems(items: AccordionItem[]): void {
        this._items = items;
        this._focusIndex = Math.min(this._focusIndex, Math.max(0, items.length - 1));
        const keysToDelete: number[] = [];
        for (const idx of this._openSet) {
            if (idx >= items.length) {
                keysToDelete.push(idx);
            }
        }
        for (const key of keysToDelete) {
            this._openSet.delete(key);
        }
        this.markDirty();
    }

    openSection(index: number): void {
        if (index < 0 || index >= this._items.length) return;
        if (this._openSet.has(index)) return;

        if (!this._multi) {
            for (const openIdx of Array.from(this._openSet)) {
                this._openSet.delete(openIdx);
                this._onToggle?.(openIdx, false);
            }
        }

        this._openSet.add(index);
        this._onToggle?.(index, true);
        this.markDirty();
    }

    closeSection(index: number): void {
        if (index < 0 || index >= this._items.length) return;
        if (!this._openSet.has(index)) return;

        this._openSet.delete(index);
        this._onToggle?.(index, false);
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (this._items.length === 0) return;
        const key = event.key?.toLowerCase();

        switch (key) {
            case 'up':
                if (this._focusIndex > 0) {
                    this._focusIndex--;
                    this.markDirty();
                }
                break;
            case 'down':
                if (this._focusIndex < this._items.length - 1) {
                    this._focusIndex++;
                    this.markDirty();
                }
                break;
            case 'enter':
            case 'space': {
                const isOpened = this._openSet.has(this._focusIndex);
                if (isOpened) {
                    this.closeSection(this._focusIndex);
                } else {
                    this.openSection(this._focusIndex);
                }
                break;
            }
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        let currentY = y;

        for (let i = 0; i < this._items.length; i++) {
            if (currentY >= y + height) break;

            const item = this._items[i];
            const isOpen = this._openSet.has(i);
            const isFocused = i === this._focusIndex;

            // 1. Render Title Bar
            const indicator = isOpen ? (caps.unicode ? '▼ ' : 'v ') : (caps.unicode ? '▶ ' : '> ');
            const titleText = `${indicator}${item.title}`;
            const titleAttrs = {
                ...attrs,
                fg: isFocused ? ({ type: 'named' as const, name: 'cyan' as const }) : attrs.fg,
                bold: isFocused
            };

            const paddedTitle = titleText.padEnd(width).slice(0, width);
            screen.writeString(x, currentY, paddedTitle, titleAttrs);
            currentY++;

            // 2. Render Body content if open
            if (isOpen) {
                const bodyLines = item.body.split('\n');
                for (const line of bodyLines) {
                    if (currentY >= y + height) break;

                    const indentedLine = `  ${line}`;
                    screen.writeString(x, currentY, indentedLine.padEnd(width).slice(0, width), attrs);
                    currentY++;
                }
            }
        }
    }
}
