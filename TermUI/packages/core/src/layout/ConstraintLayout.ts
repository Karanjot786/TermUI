// ─────────────────────────────────────────────────────
// @termuijs/core — Constraint-based Layout
// Alternative to flexbox for dashboard-style splits.
// ─────────────────────────────────────────────────────

import type { Rect } from './Rect.js';

// ── Constraint Types ─────────────────────────────────

export type Constraint =
    | { type: 'length'; value: number }
    | { type: 'percentage'; value: number }
    | { type: 'ratio'; num: number; den: number }
    | { type: 'min'; value: number }
    | { type: 'max'; value: number }
    | { type: 'fill'; weight: number };

// ── Constraint Factories ─────────────────────────────

/** Exactly n cells. */
export const length = (n: number): Constraint => ({ type: 'length', value: n });

/** n% of available space. */
export const percentage = (n: number): Constraint => ({ type: 'percentage', value: n });

/** num/den of available space. */
export const ratio = (num: number, den: number): Constraint => ({ type: 'ratio', num, den });

/** At least n cells. */
export const min = (n: number): Constraint => ({ type: 'min', value: n });

/** At most n cells. */
export const max = (n: number): Constraint => ({ type: 'max', value: n });

/** Fill remaining space with the given weight. Default weight: 1. */
export const fill = (weight: number = 1): Constraint => ({ type: 'fill', weight });

// ── Solver ───────────────────────────────────────────

function resolveSize(constraint: Constraint, available: number): number {
    switch (constraint.type) {
        case 'length': return Math.min(constraint.value, available);
        case 'percentage': return Math.min(Math.floor((available * constraint.value) / 100), available);
        case 'ratio': return constraint.den === 0 ? 0 : Math.min(
            Math.floor((available * constraint.num) / constraint.den), available
        );
        case 'min': return constraint.value;
        case 'max': return Math.min(constraint.value, available);
        case 'fill': return 0; // resolved in second pass
    }
}

/**
 * Split a rectangle into sub-rectangles using constraints.
 *
 * Example:
 * ```ts
 * const [header, body, footer] = splitRect(
 *     area,
 *     [length(3), fill(), length(1)],
 *     'vertical',
 * );
 * ```
 */
export function splitRect(
    rect: Rect,
    constraints: Constraint[],
    direction: 'horizontal' | 'vertical' = 'vertical',
    gap: number = 0,
): Rect[] {
    if (constraints.length === 0) return [];

    const totalAvailable = direction === 'horizontal' ? rect.width : rect.height;
    const count = constraints.length;
    const totalGaps = count > 1 ? gap * (count - 1) : 0;
    const availableForConstraints = Math.max(0, totalAvailable - totalGaps);

    // First pass: resolve non-fill constraints
    const sizes: number[] = [];
    let usedSpace = 0;
    let fillWeightSum = 0;

    for (const constraint of constraints) {
        if (constraint.type === 'fill') {
            sizes.push(0);
            fillWeightSum += Math.max(1, constraint.weight);
        } else {
            const size = resolveSize(constraint, availableForConstraints);
            sizes.push(size);
            usedSpace += size;
        }
    }

    // Second pass: distribute remaining space to fill constraints
    if (fillWeightSum > 0) {
        const remaining = Math.max(0, availableForConstraints - usedSpace);
        let distributed = 0;

        for (let i = 0; i < count; i++) {
            const constraint = constraints[i];
            if (!constraint || constraint.type !== 'fill') continue;

            const weight = Math.max(1, constraint.weight);
            const share = Math.floor((remaining * weight) / fillWeightSum);
            sizes[i] = share;
            distributed += share;
        }

        // Give leftover pixels to the last fill constraint
        const leftover = remaining - distributed;
        if (leftover > 0) {
            for (let i = count - 1; i >= 0; i--) {
                const constraint = constraints[i];
                if (constraint && constraint.type === 'fill') {
                    sizes[i] = (sizes[i] ?? 0) + leftover;
                    break;
                }
            }
        }
    }

    // Clamp so total doesn't exceed available
    let totalUsed = 0;
    for (let i = 0; i < count; i++) {
        const size = sizes[i] ?? 0;
        const clamped = Math.max(0, Math.min(size, availableForConstraints - totalUsed));
        sizes[i] = clamped;
        totalUsed += clamped;
    }

    // Build result rects
    const results: Rect[] = [];
    let offset = 0;

    for (let i = 0; i < count; i++) {
        const size = sizes[i] ?? 0;

        if (direction === 'horizontal') {
            results.push({ x: rect.x + offset, y: rect.y, width: size, height: rect.height });
        } else {
            results.push({ x: rect.x, y: rect.y + offset, width: rect.width, height: size });
        }

        offset += size + gap;
    }

    return results;
}
