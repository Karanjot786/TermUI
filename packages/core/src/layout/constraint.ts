// ─────────────────────────────────────────────────────
// @termuijs/core — Constraints for splits
// ─────────────────────────────────────────────────────

export enum Flex {
    Start = 'start',
    Center = 'center',
    End = 'end',
    SpaceBetween = 'space-between',
    SpaceAround = 'space-around',
}

export abstract class Constraint {
    /** Fixed length in columns/rows */
    static Length(n: number): Constraint {
        return new LengthConstraint(n);
    }
    
    /** Percentage of available space (0-100) */
    static Percentage(n: number): Constraint {
        return new PercentageConstraint(n);
    }
    
    /** Minimum length */
    static Min(n: number): Constraint {
        return new MinConstraint(n);
    }
    
    /** Maximum length */
    static Max(n: number): Constraint {
        return new MaxConstraint(n);
    }
    
    /** Fills remaining space, with a flex weight */
    static Fill(weight: number = 1): Constraint {
        return new FillConstraint(weight);
    }
}

export class LengthConstraint extends Constraint {
    constructor(public value: number) { super(); }
}

export class PercentageConstraint extends Constraint {
    constructor(public value: number) { super(); }
}

export class MinConstraint extends Constraint {
    constructor(public value: number) { super(); }
}

export class MaxConstraint extends Constraint {
    constructor(public value: number) { super(); }
}

export class FillConstraint extends Constraint {
    constructor(public weight: number) { super(); }
}

// Resolver
export function resolveConstraints(
    available: number,
    constraints: Constraint[],
    flex: Flex = Flex.Start,
    gap: number = 0
): { offset: number; size: number }[] {
    const n = constraints.length;
    if (n === 0) return [];

    const sizes = new Array(n).fill(0);
    const minSizes = new Array(n).fill(0);
    const maxSizes = new Array(n).fill(Infinity);
    
    let totalFixed = 0;
    let fillWeightSum = 0;

    // 1. Initial pass: resolve absolutes
    for (let i = 0; i < n; i++) {
        const c = constraints[i];
        if (c instanceof LengthConstraint) {
            sizes[i] = c.value;
            totalFixed += c.value;
        } else if (c instanceof PercentageConstraint) {
            sizes[i] = Math.floor((available * c.value) / 100);
            totalFixed += sizes[i];
        } else if (c instanceof MinConstraint) {
            minSizes[i] = c.value;
        } else if (c instanceof MaxConstraint) {
            maxSizes[i] = c.value;
        } else if (c instanceof FillConstraint) {
            fillWeightSum += c.weight;
        }
    }

    // 2. Resolve Min/Max
    // For Min, we must reserve at least that much space
    for (let i = 0; i < n; i++) {
        if (constraints[i] instanceof MinConstraint) {
            sizes[i] = minSizes[i];
            totalFixed += sizes[i];
        }
    }

    // Gaps
    const totalGaps = gap * (n - 1);
    let remaining = Math.max(0, available - totalFixed - totalGaps);

    // 3. Resolve Fill
    if (fillWeightSum > 0) {
        let distributed = 0;
        for (let i = 0; i < n; i++) {
            const c = constraints[i];
            if (c instanceof FillConstraint) {
                const share = Math.floor((remaining * c.weight) / fillWeightSum);
                sizes[i] = share;
                distributed += share;
            }
        }
        
        // leftover to last fill
        let leftover = remaining - distributed;
        if (leftover > 0) {
            for (let i = n - 1; i >= 0; i--) {
                if (constraints[i] instanceof FillConstraint) {
                    sizes[i] += leftover;
                    break;
                }
            }
        }
    }

    // 4. Position according to Flex
    const totalUsed = sizes.reduce((a, b) => a + b, 0) + totalGaps;
    const freeSpace = Math.max(0, available - totalUsed);

    const results: { offset: number; size: number }[] = [];
    let offset = 0;
    let spaceBetween = 0;

    switch (flex) {
        case Flex.Start:
            break;
        case Flex.End:
            offset = freeSpace;
            break;
        case Flex.Center:
            offset = freeSpace / 2;
            break;
        case Flex.SpaceBetween:
            if (n > 1) spaceBetween = freeSpace / (n - 1);
            break;
        case Flex.SpaceAround:
            if (n > 0) {
                spaceBetween = freeSpace / n;
                offset = spaceBetween / 2;
            }
            break;
    }

    for (let i = 0; i < n; i++) {
        results.push({ offset: Math.floor(offset), size: sizes[i] });
        offset += sizes[i] + gap + spaceBetween;
    }

    return results;
}

// ─────────────────────────────────────────────────────
// Topological Layout Solver (Pos & Dim Algebra)
// ─────────────────────────────────────────────────────

import { Pos } from './pos.js';
import { Dim } from './dim.js';
import type { LayoutContext } from './LayoutContext.js';

export interface ResolvableNode {
    id: string;
    x?: number | Pos;
    y?: number | Pos;
    width?: number | Dim;
    height?: number | Dim;
    
    // Intrinsic / measured content size (auto)
    contentWidth: number;
    contentHeight: number;
    
    // Result
    computed: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    
    // For Pos.align
    groupId?: string;
}

export function resolveLayoutVariables(
    nodes: ResolvableNode[],
    parentWidth: number,
    parentHeight: number
) {
    const state = new Map<string, number | 'computing'>();

    function evaluateVariable(node: ResolvableNode, varName: 'x' | 'y' | 'width' | 'height'): number {
        const key = `${node.id}:${varName}`;
        const existing = state.get(key);
        if (existing === 'computing') {
            throw new Error(`Cycle detected resolving ${key}`);
        }
        if (typeof existing === 'number') {
            return existing;
        }

        state.set(key, 'computing');

        let result = 0;
        const val = node[varName];

        const ctx: LayoutContext = {
            parentWidth,
            parentHeight,
            axis: (varName === 'x' || varName === 'width') ? 'horizontal' : 'vertical',
            contentWidth: node.contentWidth,
            contentHeight: node.contentHeight,
            
            get elementWidth() { return evaluateVariable(node, 'width'); },
            get elementHeight() { return evaluateVariable(node, 'height'); },
            get elementX() { return evaluateVariable(node, 'x'); },
            get elementY() { return evaluateVariable(node, 'y'); },
            
            getGroupSize(groupId: string) {
                const groupNodes = nodes.filter(n => n.groupId === groupId);
                let maxSize = 0;
                for (const gNode of groupNodes) {
                    const size = evaluateVariable(gNode, this.axis === 'horizontal' ? 'width' : 'height');
                    maxSize = Math.max(maxSize, size);
                }
                return maxSize;
            }
        };

        if (val instanceof Pos) {
            result = val.evaluate(ctx);
        } else if (val instanceof Dim) {
            result = val.evaluate(ctx);
        } else if (typeof val === 'number') {
            result = val;
        }

        state.set(key, result);
        node.computed[varName] = result;
        return result;
    }

    for (const node of nodes) {
        evaluateVariable(node, 'width');
        evaluateVariable(node, 'height');
        evaluateVariable(node, 'x');
        evaluateVariable(node, 'y');
    }
}

