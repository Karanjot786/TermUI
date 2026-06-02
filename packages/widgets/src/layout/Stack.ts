// ─────────────────────────────────────────────────────
// @termuijs/widgets — Stack layout widget
// Layers children on top of each other (Z-axis stacking)
// ─────────────────────────────────────────────────────

import type { Screen, Style } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface StackOptions {
    /** Which child is on top (receives key events). Default: last child */
    activeIndex?: number;
}

/**
 * Stack — a widget that layers children on top of each other.
 *
 * All children share the same rect (the Stack's bounds).
 * Children render in array order: index 0 is bottom, last index is top.
 * The active child's non-space characters overwrite lower layers.
 */
export class Stack extends Widget {
    private _children: Widget[] = [];
    private _activeIndex: number;

    constructor(children: Widget[], style?: Partial<Style>, opts?: StackOptions) {
        super({ flexGrow: 1, ...style });
        this._activeIndex = opts?.activeIndex ?? (children.length > 0 ? children.length - 1 : 0);
        this.setChildren(children);
    }

    /**
     * Replace all children with a new array.
     */
    setChildren(children: Widget[]): void {
        // Remove existing children
        for (const child of this._children) {
            child.unmount();
            child.parent = null;
        }
        
        this._children = [];
        this._children = children;
        
        // Register children with this widget
        for (const child of this._children) {
            child.parent = this;
            child.setStyle({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
        }
        
        // Ensure activeIndex is valid
        if (this._activeIndex >= this._children.length) {
            this._activeIndex = this._children.length > 0 ? this._children.length - 1 : 0;
        }
        
        this.markDirty();
    }

    /**
     * Set which child is active (on top).
     */
    setActiveIndex(index: number): void {
        if (index >= 0 && index < this._children.length && index !== this._activeIndex) {
            this._activeIndex = index;
            this.markDirty();
        }
    }

    /**
     * Get the currently active child index.
     */
    getActiveIndex(): number {
        return this._activeIndex;
    }

    protected _renderSelf(screen: Screen): void {
        // No self-rendering needed; children handle rendering
    }

    /**
     * Override render to layer children properly.
     * Children render in order, with later children overwriting earlier ones.
     */
    render(): string {
        if (this._children.length === 0) return '';
        
        // Render all children in order (bottom to top)
        // The screen handles overwriting at the cell level
        const mockScreen = this._screen;
        if (mockScreen) {
            for (let i = 0; i < this._children.length; i++) {
                const child = this._children[i];
                child.setScreen(mockScreen);
                child.setRect(this._rect);
                child.render();
            }
        }
        
        return '';
    }

    /**
     * Sync layout to all children (they all share the same rect).
     */
    syncLayout(): void {
        for (const child of this._children) {
            child.setRect(this._rect);
            child.syncLayout();
        }
    }

    /**
     * Get children for iteration.
     */
    get children(): Widget[] {
        return this._children;
    }
}
