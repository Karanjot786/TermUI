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
        x: (v1.x ?? 0) + (v2.x ?? 0),
        y: (v1.y ?? 0) + (v2.y ?? 0)
    };
}

/**
 * Scales a 2D vector by a scalar factor multiplier
 */
export function scale(v: Vec2, factor: number): Vec2 {
    return {
        x: (v.x ?? 0) * (factor ?? 1),
        y: (v.y ?? 0) * (factor ?? 1)
    };
}

/**
 * Linearly interpolates between two 2D vectors based on an alpha progress step
 */
export function lerp(v1: Vec2, v2: Vec2, alpha: number): Vec2 {
    const validAlpha = alpha ?? 0;
    return {
        x: (v1.x ?? 0) + ((v2.x ?? 0) - (v1.x ?? 0)) * validAlpha,
        y: (v1.y ?? 0) + ((v2.y ?? 0) - (v1.y ?? 0)) * validAlpha
    };
}

/**
 * Computes the Euclidean distance between two 2D vector coordinate spaces
 */
export function distance(v1: Vec2, v2: Vec2): number {
    const dx = (v2.x ?? 0) - (v1.x ?? 0);
    const dy = (v2.y ?? 0) - (v1.y ?? 0);
    return Math.sqrt(dx * dx + dy * dy);
}