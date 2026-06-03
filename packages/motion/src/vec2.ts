/**
 * Representation of a 2D Vector for position animation utility blocks
 */
export interface Vec2 {
    x: number;
    y: number;
}

/**
 * Adds two 2D vectors together
 */
export function add(v1: Vec2, v2: Vec2): Vec2 {
    return {
        x: v1.x + v2.x,
        y: v1.y + v2.y
    };
}

/**
 * Scales a 2D vector by a scalar factor multiplier
 */
export function scale(v: Vec2, factor: number): Vec2 {
    return {
        x: v.x * factor,
        y: v.y * factor
    };
}

/**
 * Linearly interpolates between two 2D vectors based on an alpha progress step
 */
export function lerp(v1: Vec2, v2: Vec2, alpha: number): Vec2 {
    return {
        x: v1.x + (v2.x - v1.x) * alpha,
        y: v1.y + (v2.y - v1.y) * alpha
    };
}

/**
 * Computes the Euclidean distance between two 2D vector coordinate spaces
 */
export function distance(v1: Vec2, v2: Vec2): number {
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    return Math.sqrt(dx * dx + dy * dy);
}
