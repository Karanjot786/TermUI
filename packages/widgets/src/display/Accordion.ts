// @termuijs/widgets - Accordion widget
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
    title: string;
    content: string;
}

export interface AccordionOptions {
    multiple?: boolean;
    openIndex?: number;
    expandChar?: string;
    collapseChar?: string;
    onToggle?: (index: number, open: boolean) => void;
    animationMs?: number;
}

interface AnimationState {
    startTime: number;
    opening: boolean;
    totalLines: number;
}

export class Accordion extends Widget {
    private _sections: AccordionSection[];
    private _openSet: Set<number>;
    private _multiple: boolean;
    private _expandChar: string;
    private _collapseChar: string;
    private _onToggle?: (index: number, open: boolean) => void;
    private _focusedIndex: number = 0;
    private _animationMs: number;
    private _animations: Map<number, AnimationState> = new Map();

    constructor(
        sections: AccordionSection[],
        style: Partial<Style> = {},
        opts: AccordionOptions = {},
    ) {
        super(style);
        this.focusable = true;
        this._sections = sections;
        this._multiple = opts.multiple ?? false;
        this._expandChar = opts.expandChar ?? (caps.unicode ? '>' : '>');
        this._collapseChar = opts.collapseChar ?? (caps.unicode ? 'v' : 'v');
        this._onToggle = opts.onToggle;
        this._animationMs = opts.animationMs ?? 250;
        this._openSet = new Set();
        if (sections.length > 0) {
            const idx = opts.openIndex ?? 0;
            if (idx >= 0 && idx < sections.length) this._openSet.add(idx);
        }
        this._updateHeight();
    }

    open(index: number): void {
        if (index < 0 || index >= this._sections.length) return;
        if (this._openSet.has(index)) return;
        if (!this._multiple) {
            for (const idx of this._openSet) {
                this._startAnimation(idx, false);
                this._onToggle?.(idx, false);
            }
            this._openSet.clear();
        }
        this._openSet.add(index);
        this._startAnimation(index, true);
        this._updateHeight();
        this._onToggle?.(index, true);
        this.markDirty();
    }

    close(index: number): void {
        if (!this._openSet.has(index)) return;
        this._openSet.delete(index);
        this._startAnimation(index, false);
        this._updateHeight();
        this._onToggle?.(index, false);
        this.markDirty();
    }

    toggle(index: number): void {
        if (this._openSet.has(index)) this.close(index);
        else this.open(index);
    }

    isOpen(index: number): boolean { return this._openSet.has(index); }
    getFocusedIndex(): number { return this._focusedIndex; }

    setSections(sections: AccordionSection[]): void {
        this._sections = sections;
        this._openSet.clear();
        if (sections.length > 0) this._openSet.add(0);
        this._focusedIndex = 0;
        this._animations.clear();
        this._updateHeight();
        this.markDirty();
    }

    private _startAnimation(index: number, opening: boolean): void {
        const section = this._sections[index];
        if (!section) return;
        const totalLines = section.content.split('\n').length;
        this._animations.set(index, { startTime: Date.now(), opening, totalLines });
    }

    private _getVisibleLines(index: number): number {
        const anim = this._animations.get(index);
        if (!anim) {
            return this._openSet.has(index) ? this._sections[index].content.split('\n').length : 0;
        }
        const elapsed = Date.now() - anim.startTime;
        const progress = Math.min(1, elapsed / this._animationMs);
        const visible = anim.opening
            ? Math.floor(progress * anim.totalLines)
            : Math.floor((1 - progress) * anim.totalLines);
        if (progress >= 1) this._animations.delete(index);
        return visible;
    }

    handleKey(event: KeyEvent): void {
        switch (event.key.toLowerCase()) {
            case 'enter':
            case ' ':
            case 'space':
                this.toggle(this._focusedIndex);
                break;
            case 'arrowup':
            case 'up':
                if (this._focusedIndex > 0) { this._focusedIndex--; this.markDirty(); }
                break;
            case 'arrowdown':
            case 'down':
                if (this._focusedIndex < this._sections.length - 1) { this._focusedIndex++; this.markDirty(); }
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        let row = 0;
        let anyAnimating = false;

        for (let i = 0; i < this._sections.length; i++) {
            if (row >= height) break;

            const section = this._sections[i];
            const open = this._openSet.has(i);
            const focused = i === this._focusedIndex;
            const anim = this._animations.get(i);
            if (anim) anyAnimating = true;

            const progress = anim
                ? Math.min(1, (Date.now() - anim.startTime) / this._animationMs)
                : (open ? 1 : 0);
            const indicator = progress > 0.5 ? this._collapseChar : this._expandChar;
            const titleLine = indicator + ' ' + section.title;
            const titleAttrs = focused ? { ...attrs, bold: true } : attrs;
            screen.writeString(x, y + row, truncate(titleLine, width), titleAttrs);
            row++;

            const visibleLines = this._getVisibleLines(i);
            if (visibleLines > 0) {
                const lines = section.content.split('\n').slice(0, visibleLines);
                for (const line of lines) {
                    if (row >= height) break;
                    screen.writeString(x, y + row, truncate('  ' + line, width), attrs);
                    row++;
                }
            }
        }

        if (anyAnimating) setTimeout(() => this.markDirty(), 16);
    }

    private _updateHeight(): void {
        let total = this._sections.length;
        for (let i = 0; i < this._sections.length; i++) {
            if (this._openSet.has(i)) {
                total += this._sections[i].content.split('\n').length;
            }
        }
        this._style.height = total;
    }
}
