// ─────────────────────────────────────────────────────
// @termuijs/core — Layout types (Rect, Size, Edges)
// ─────────────────────────────────────────────────────

/**
 * A computed rectangle with position and size.
 */
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * A 2D size.
 */
export interface Size {
    width: number;
    height: number;
}

/**
 * Create an empty rect at origin.
 */
export function emptyRect(): Rect {
    return { x: 0, y: 0, width: 0, height: 0 };
}

/**
 * Check if a point is inside a rect.
 */
export function containsPoint(rect: Rect, x: number, y: number): boolean {
    return x >= rect.x && x < rect.x + rect.width &&
        y >= rect.y && y < rect.y + rect.height;
}

/**
 * Shrink a rect by the given edges (inset).
 */
export function shrinkRect(rect: Rect, top: number, right: number, bottom: number, left: number): Rect {
    return {
        x: rect.x + left,
        y: rect.y + top,
        width: Math.max(0, rect.width - left - right),
        height: Math.max(0, rect.height - top - bottom),
    };
}

/**
 * Intersect two rects. Returns the overlapping region, or null if disjoint.
 */
export function intersectRect(a: Rect, b: Rect): Rect | null {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const r = Math.min(a.x + a.width, b.x + b.width);
    const bot = Math.min(a.y + a.height, b.y + b.height);
    if (r <= x || bot <= y) return null;
    return { x, y, width: r - x, height: bot - y };
}

/**
 * Union two rects into the smallest bounding rect that contains both.
 */
export function unionRect(a: Rect, b: Rect): Rect {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const r = Math.max(a.x + a.width, b.x + b.width);
    const bot = Math.max(a.y + a.height, b.y + b.height);
    return { x, y, width: r - x, height: bot - y };
}
