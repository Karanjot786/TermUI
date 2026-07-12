import { prefersReducedMotion } from '@termuijs/core';
import { transition, type EasingFn, easings } from './transitions.js';

/**
 * Represents a 2D coordinate or vector.
 */
export interface Vec2 {
    x: number;
    y: number;
}

/**
 * Adds two 2D vectors.
 */
export function add(v1: Vec2, v2: Vec2): Vec2 {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
}

/**
 * Subtracts the second 2D vector from the first.
 */
export function subtract(v1: Vec2, v2: Vec2): Vec2 {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
}

/**
 * Scales a 2D vector by a factor.
 */
export function scale(v: Vec2, factor: number): Vec2 {
    return { x: v.x * factor, y: v.y * factor };
}

/**
 * Linearly interpolates between two 2D vectors.
 */
export function lerp(v1: Vec2, v2: Vec2, t: number): Vec2 {
    return {
        x: v1.x + (v2.x - v1.x) * t,
        y: v1.y + (v2.y - v1.y) * t,
    };
}

/**
 * Calculates the straight-line distance between two 2D vectors.
 */
export function distance(v1: Vec2, v2: Vec2): number {
    return Math.sqrt((v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2);
}

/**
 * Calculates the magnitude (length) of a 2D vector.
 */
export function length(v: Vec2): number {
    return Math.sqrt(v.x ** 2 + v.y ** 2);
}

/**
 * Returns a normalized unit vector pointing in the same direction.
 */
export function normalize(v: Vec2): Vec2 {
    const len = length(v);
    return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

/**
 * Calculates the dot product of two 2D vectors.
 */
export function dot(v1: Vec2, v2: Vec2): number {
    return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Generates a circular path centered at `center` with the specified radius and steps.
 */
export function circlePath(center: Vec2, radius: number, steps = 16): Vec2[] {
    const path: Vec2[] = [];
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        path.push({
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius,
        });
    }
    return path;
}

/**
 * Generates a quadratic or cubic Bezier curve path.
 */
export function bezierCurve(p0: Vec2, p1: Vec2, p2: Vec2, p3?: Vec2 | number, steps = 16): Vec2[] {
    let actualP3: Vec2 | undefined = undefined;
    let actualSteps = steps;

    if (typeof p3 === 'number') {
        actualSteps = p3;
    } else {
        actualP3 = p3;
    }

    const path: Vec2[] = [];
    for (let i = 0; i <= actualSteps; i++) {
        const t = i / actualSteps;
        if (actualP3) {
            // Cubic Bezier
            const mt = 1 - t;
            const x = mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * actualP3.x;
            const y = mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * actualP3.y;
            path.push({ x, y });
        } else {
            // Quadratic Bezier
            const mt = 1 - t;
            const x = mt ** 2 * p0.x + 2 * mt * t * p1.x + t ** 2 * p2.x;
            const y = mt ** 2 * p0.y + 2 * mt * t * p1.y + t ** 2 * p2.y;
            path.push({ x, y });
        }
    }
    return path;
}

/**
 * Options for configuring pathAnimation.
 */
export interface PathAnimationOptions {
    durationMs?: number;
    speed?: number; // speed in units/second
    easing?: EasingFn;
    loop?: boolean;
    alternate?: boolean;
}

/**
 * Animates coordinates along a multi-point path at a constant speed.
 * Respects the user's reduced-motion setting.
 */
export function pathAnimation(
    path: Vec2[],
    durationOrOptions: number | PathAnimationOptions,
    onFrame: (pos: Vec2) => void,
    onComplete?: () => void,
    options?: PathAnimationOptions
): () => void {
    if (!path || path.length === 0) {
        onComplete?.();
        return () => {};
    }
    if (path.length === 1) {
        onFrame(path[0]);
        onComplete?.();
        return () => {};
    }

    let config: PathAnimationOptions = {};
    if (typeof durationOrOptions === 'number') {
        config = { durationMs: durationOrOptions, ...(options || {}) };
    } else {
        config = durationOrOptions || {};
    }

    const isReduced = prefersReducedMotion();
    const { easing = easings.easeInOut, loop = false, alternate = false } = config;
    const actualLoop = isReduced ? false : loop;

    let isCancelled = false;
    let currentCancel: (() => void) | null = null;
    let currentPath = [...path];

    function run() {
        if (isCancelled) return;

        // Precompute segment lengths and cumulative distances
        const segmentLengths: number[] = [];
        const cumulativeDistances: number[] = [0];
        let totalLength = 0;

        for (let i = 0; i < currentPath.length - 1; i++) {
            const len = distance(currentPath[i], currentPath[i + 1]);
            segmentLengths.push(len);
            totalLength += len;
            cumulativeDistances.push(totalLength);
        }

        // Determine duration
        let durationMs = config.durationMs || 0;
        if (config.speed && config.speed > 0) {
            durationMs = totalLength === 0 ? 0 : (totalLength / config.speed) * 1000;
        }

        if (durationMs <= 0 || isReduced) {
            onFrame(currentPath[currentPath.length - 1]);
            onComplete?.();
            return;
        }

        currentCancel = transition({
            durationMs,
            easing,
            onFrame: (t: number) => {
                if (totalLength === 0) {
                    onFrame(currentPath[currentPath.length - 1]);
                    return;
                }
                const targetDist = t * totalLength;
                
                // Find the active segment index
                let i = 0;
                while (i < currentPath.length - 2 && cumulativeDistances[i + 1] < targetDist) {
                    i++;
                }
                
                const segStartDist = cumulativeDistances[i];
                const segLen = segmentLengths[i];
                
                if (segLen === 0) {
                    onFrame(currentPath[i]);
                } else {
                    const segT = (targetDist - segStartDist) / segLen;
                    onFrame(lerp(currentPath[i], currentPath[i + 1], segT));
                }
            },
            onComplete: () => {
                if (actualLoop) {
                    if (alternate) {
                        currentPath.reverse();
                    }
                    run();
                } else {
                    onComplete?.();
                }
            }
        });
    }

    run();

    return () => {
        isCancelled = true;
        if (currentCancel) {
            currentCancel();
        }
    };
}
