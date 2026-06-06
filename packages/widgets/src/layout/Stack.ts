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
 */
export class Stack extends Widget {
    private _activeIndex: number;

    constructor(children: Widget[], style?: Partial<Style>, opts?: StackOptions) {
        super(style);
        this._activeIndex = opts?.activeIndex ?? (children.length > 0 ? children.length - 1 : 0);
        
        // Add all children
        for (const child of children) {
            this.addChild(child);
        }
    }

    /**
     * Replace all children with a new array.
     */
    setChildren(children: Widget[]): void {
        // Remove existing children
        while (this._children.length > 0) {
            const child = this._children[0];
            this.removeChild(child);
        }
        
        // Add new children
        for (const child of children) {
            this.addChild(child);
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

    /**
     * Required abstract method implementation.
     * Stack is a pure layout container — no self-rendering needed.
     */
    protected _renderSelf(_screen: Screen): void {
        // Stack is a pure layout container - no self-rendering needed
    }
}
