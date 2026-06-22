// @termuijs/ui - Accordion widget
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
    multi?: boolean;
    onToggle?: (index: number, open: boolean) => void;
    animationMs?: number;
}

interface AnimationState {
    startTime: number;
    opening: boolean;
    visibleLines: number;
    totalLines: number;
}

export class Accordion extends Widget {
    private _items: AccordionItem[] = [];
    private _multi = false;
    private _onToggle?: (index: number, open: boolean) => void;
    private _focusIndex = 0;
    private _openSet: Set<number> = new Set();
    private _animationMs: number;
    private _animations: Map<number, AnimationState> = new Map();

    focusable = true;

    constructor(items: AccordionItem[], style: Partial<Style> = {}, opts: AccordionOptions = {}) {
        super(mergeStyles(defaultStyle(), style));
        this._items = items;
        this._multi = opts?.multi ?? false;
        this._onToggle = opts?.onToggle;
        this._animationMs = opts?.animationMs ?? 250;
    }

    setItems(items: AccordionItem[]): void {
        this._items = items;
        this._focusIndex = Math.min(this._focusIndex, Math.max(0, items.length - 1));
        const keysToDelete: number[] = [];
        for (const idx of this._openSet) {
            if (idx >= items.length) keysToDelete.push(idx);
        }
        for (const key of keysToDelete) this._openSet.delete(key);
        this.markDirty();
    }

    openSection(index: number): void {
        if (index < 0 || index >= this._items.length) return;
        if (this._openSet.has(index)) return;

        if (!this._multi) {
            for (const openIdx of Array.from(this._openSet)) {
                this._startAnimation(openIdx, false);
                this._openSet.delete(openIdx);
                this._onToggle?.(openIdx, false);
            }
        }

        this._openSet.add(index);
        this._startAnimation(index, true);
        this._onToggle?.(index, true);
        this.markDirty();
    }

    closeSection(index: number): void {
        if (index < 0 || index >= this._items.length) return;
        if (!this._openSet.has(index)) return;

        this._openSet.delete(index);
        this._startAnimation(index, false);
        this._onToggle?.(index, false);
        this.markDirty();
    }

    private _startAnimation(index: number, opening: boolean): void {
        const item = this._items[index];
        if (!item) return;
        const totalLines = item.body.split('\n').length;
        this._animations.set(index, {
            startTime: Date.now(),
            opening,
            visibleLines: opening ? 0 : totalLines,
            totalLines,
        });
    }

    private _getVisibleLines(index: number): number {
        const anim = this._animations.get(index);
        if (!anim) {
            return this._openSet.has(index) ? this._items[index].body.split('\n').length : 0;
        }
        const elapsed = Date.now() - anim.startTime;
        const progress = Math.min(1, elapsed / this._animationMs);
        let visible: number;
        if (anim.opening) {
            visible = Math.floor(progress * anim.totalLines);
        } else {
            visible = Math.floor((1 - progress) * anim.totalLines);
        }
        if (progress >= 1) this._animations.delete(index);
        return visible;
    }

    handleKey(event: KeyEvent): void {
        if (this._items.length === 0) return;
        const key = event.key?.toLowerCase();
        switch (key) {
            case 'up':
                if (this._focusIndex > 0) { this._focusIndex--; this.markDirty(); }
                break;
            case 'down':
                if (this._focusIndex < this._items.length - 1) { this._focusIndex++; this.markDirty(); }
                break;
            case 'enter':
            case 'space': {
                const isOpened = this._openSet.has(this._focusIndex);
                if (isOpened) this.closeSection(this._focusIndex);
                else this.openSection(this._focusIndex);
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
        let anyAnimating = false;

        for (let i = 0; i < this._items.length; i++) {
            if (currentY >= y + height) break;

            const item = this._items[i];
            const isOpen = this._openSet.has(i);
            const isFocused = i === this._focusIndex;
            const anim = this._animations.get(i);
            if (anim) anyAnimating = true;

            const progress = anim
                ? Math.min(1, (Date.now() - anim.startTime) / this._animationMs)
                : (isOpen ? 1 : 0);
            const indicator = progress > 0.5 ? 'v ' : '> ';

            const titleText = indicator + item.title;
            const titleAttrs = {
                ...attrs,
                fg: isFocused ? ({ type: 'named' as const, name: 'cyan' as const }) : attrs.fg,
                bold: isFocused
            };

            screen.writeString(x, currentY, titleText.padEnd(width).slice(0, width), titleAttrs);
            currentY++;

            const visibleLines = this._getVisibleLines(i);
            if (visibleLines > 0) {
                const bodyLines = item.body.split('\n').slice(0, visibleLines);
                for (const line of bodyLines) {
                    if (currentY >= y + height) break;
                    screen.writeString(x, currentY, ('  ' + line).padEnd(width).slice(0, width), attrs);
                    currentY++;
                }
            }
        }

        if (anyAnimating) setTimeout(() => this.markDirty(), 16);
    }
}
