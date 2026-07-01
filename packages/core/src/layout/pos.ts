// ─────────────────────────────────────────────────────
// @termuijs/core — Position Algebra
// ─────────────────────────────────────────────────────

import type { LayoutContext } from './LayoutContext.js';

export abstract class Pos {
    /** Computes the final numeric coordinate */
    abstract evaluate(ctx: LayoutContext): number;

    /** Center the element within its parent */
    static center(): Pos {
        return new PosCenter();
    }

    /** Anchor the element `margin` units away from the end (right/bottom) */
    static anchorEnd(margin: number = 0): Pos {
        return new PosAnchorEnd(margin);
    }

    /** Align multiple siblings as a group */
    static align(alignment: 'start' | 'center' | 'end', groupId: string): Pos {
        return new PosAlign(alignment, groupId);
    }
}

class PosCenter extends Pos {
    dependencies() {
        return ['parentSize', 'elementSize'];
    }
    evaluate(ctx: LayoutContext) {
        const pSize = ctx.axis === 'horizontal' ? ctx.parentWidth : ctx.parentHeight;
        const eSize = ctx.axis === 'horizontal' ? ctx.elementWidth : ctx.elementHeight;
        return Math.floor((pSize - eSize) / 2);
    }
}

class PosAnchorEnd extends Pos {
    constructor(public margin: number) { super(); }

    dependencies() {
        return ['parentSize', 'elementSize'];
    }
    evaluate(ctx: LayoutContext) {
        const pSize = ctx.axis === 'horizontal' ? ctx.parentWidth : ctx.parentHeight;
        const eSize = ctx.axis === 'horizontal' ? ctx.elementWidth : ctx.elementHeight;
        return pSize - eSize - this.margin;
    }
}

class PosAlign extends Pos {
    constructor(public alignment: 'start' | 'center' | 'end', public groupId: string) { super(); }

    dependencies() {
        // Depends on siblings in the same group being evaluated.
        // Handled specially by the resolver.
        return ['group:' + this.groupId, 'elementSize'];
    }
    
    evaluate(ctx: LayoutContext) {
        // Group alignment means we find the max size of elements in the group,
        // compute group bounding box, and place this element inside it.
        const groupSize = ctx.getGroupSize(this.groupId);
        if (groupSize === 0) return 0;
        
        const pSize = ctx.axis === 'horizontal' ? ctx.parentWidth : ctx.parentHeight;
        const eSize = ctx.axis === 'horizontal' ? ctx.elementWidth : ctx.elementHeight;
        
        // Let's say the group as a whole is placed based on alignment
        let groupOffset = 0;
        if (this.alignment === 'center') {
            groupOffset = Math.floor((pSize - groupSize) / 2);
        } else if (this.alignment === 'end') {
            groupOffset = pSize - groupSize;
        }

        // Within the group, element aligns differently depending on orientation?
        // Usually `align` centers the element within the group's bounding box.
        const localOffset = Math.floor((groupSize - eSize) / 2);
        return groupOffset + localOffset;
    }
}
