// ─────────────────────────────────────────────────────
// @termuijs/core — Dimension Algebra
// ─────────────────────────────────────────────────────

import type { LayoutContext } from './LayoutContext.js';

export abstract class Dim {
    /** Computes the final numeric size */
    abstract evaluate(ctx: LayoutContext): number;

    /** Size to the intrinsic content of the element */
    static auto(): Dim {
        return new DimAuto();
    }

    /** Fill remaining space in the parent, minus an optional margin */
    static fill(margin: number = 0): Dim {
        return new DimFill(margin);
    }

    /** Custom function to determine size */
    static func(fn: (ctx: LayoutContext) => number): Dim {
        return new DimFunc(fn);
    }
}

class DimAuto extends Dim {
    dependencies() {
        return ['contentSize'];
    }
    evaluate(ctx: LayoutContext) {
        return ctx.axis === 'horizontal' ? ctx.contentWidth : ctx.contentHeight;
    }
}

class DimFill extends Dim {
    constructor(public margin: number) { super(); }
    
    dependencies() {
        return ['parentSize'];
    }
    evaluate(ctx: LayoutContext) {
        const avail = ctx.axis === 'horizontal' ? ctx.parentWidth : ctx.parentHeight;
        return Math.max(0, avail - this.margin);
    }
}

class DimFunc extends Dim {
    constructor(public fn: (ctx: LayoutContext) => number) { super(); }
    
    dependencies() {
        // Can't statically know, assume it might need anything except its own result
        return [];
    }
    evaluate(ctx: LayoutContext) {
        return this.fn(ctx);
    }
}
