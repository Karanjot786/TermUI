import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    add,
    subtract,
    scale,
    lerp,
    distance,
    length,
    normalize,
    dot,
    circlePath,
    bezierCurve,
    pathAnimation,
    type Vec2
} from './vectors.js';
import { easings } from './transitions.js';
import { unsubscribeAll as timerPoolUnsubscribeAll } from './timer-pool.js';

async function advanceTime(ms: number) {
    const steps = Math.ceil(ms / 16);
    for (let i = 0; i < steps; i++) {
        vi.advanceTimersByTime(16);
        await Promise.resolve();
    }
}

describe('Vector Mathematics', () => {
    it('adds two 2D vectors correctly', () => {
        const v1: Vec2 = { x: 2, y: 3 };
        const v2: Vec2 = { x: -1, y: 5 };
        expect(add(v1, v2)).toEqual({ x: 1, y: 8 });
    });

    it('subtracts two 2D vectors correctly', () => {
        const v1: Vec2 = { x: 2, y: 3 };
        const v2: Vec2 = { x: 1, y: 1 };
        expect(subtract(v1, v2)).toEqual({ x: 1, y: 2 });
    });

    it('scales a 2D vector correctly', () => {
        const v: Vec2 = { x: 3, y: -4 };
        expect(scale(v, 2)).toEqual({ x: 6, y: -8 });
        expect(scale(v, 0.5)).toEqual({ x: 1.5, y: -2 });
    });

    it('linearly interpolates between two vectors correctly', () => {
        const v1: Vec2 = { x: 0, y: 0 };
        const v2: Vec2 = { x: 10, y: 20 };
        expect(lerp(v1, v2, 0)).toEqual({ x: 0, y: 0 });
        expect(lerp(v1, v2, 0.5)).toEqual({ x: 5, y: 10 });
        expect(lerp(v1, v2, 1)).toEqual({ x: 10, y: 20 });
    });

    it('calculates straight-line distance correctly', () => {
        const v1: Vec2 = { x: 0, y: 0 };
        const v2: Vec2 = { x: 3, y: 4 };
        expect(distance(v1, v2)).toBe(5);

        const v3: Vec2 = { x: 1, y: 1 };
        expect(distance(v3, v3)).toBe(0);
    });

    it('calculates vector length correctly', () => {
        const v: Vec2 = { x: 3, y: 4 };
        expect(length(v)).toBe(5);
        expect(length({ x: 0, y: 0 })).toBe(0);
    });

    it('normalizes a vector correctly', () => {
        const v: Vec2 = { x: 3, y: 4 };
        expect(normalize(v)).toEqual({ x: 0.6, y: 0.8 });
        expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    });

    it('calculates dot product correctly', () => {
        const v1: Vec2 = { x: 1, y: 2 };
        const v2: Vec2 = { x: 3, y: 4 };
        expect(dot(v1, v2)).toBe(11); // 1*3 + 2*4 = 11
    });
});

describe('Path Generators', () => {
    it('generates circle paths with closed loop matching start/end points', () => {
        const center: Vec2 = { x: 5, y: 5 };
        const radius = 10;
        const steps = 8;
        const path = circlePath(center, radius, steps);

        expect(path).toHaveLength(steps + 1);
        // Start and end should be close to center.x + radius, center.y
        expect(path[0].x).toBeCloseTo(15, 5);
        expect(path[0].y).toBeCloseTo(5, 5);
        expect(path[steps].x).toBeCloseTo(15, 5);
        expect(path[steps].y).toBeCloseTo(5, 5);
    });

    it('generates quadratic Bezier curves correctly', () => {
        const p0 = { x: 0, y: 0 };
        const p1 = { x: 5, y: 10 };
        const p2 = { x: 10, y: 0 };
        const path = bezierCurve(p0, p1, p2, 4);

        expect(path).toHaveLength(5);
        expect(path[0]).toEqual(p0);
        expect(path[4]).toEqual(p2);

        // At t=0.5, formula: 0.25*p0 + 0.5*p1 + 0.25*p2
        // x = 0.25*0 + 0.5*5 + 0.25*10 = 5
        // y = 0.25*0 + 0.5*10 + 0.25*0 = 5
        expect(path[2]).toEqual({ x: 5, y: 5 });
    });

    it('generates cubic Bezier curves correctly', () => {
        const p0 = { x: 0, y: 0 };
        const p1 = { x: 3, y: 9 };
        const p2 = { x: 6, y: -9 };
        const p3 = { x: 9, y: 0 };
        const path = bezierCurve(p0, p1, p2, p3, 4);

        expect(path).toHaveLength(5);
        expect(path[0]).toEqual(p0);
        expect(path[4]).toEqual(p3);

        // At t=0.5, formula: 0.125*p0 + 0.375*p1 + 0.375*p2 + 0.125*p3
        // x = 0.125*0 + 0.375*3 + 0.375*6 + 0.125*9 = 4.5
        // y = 0.125*0 + 0.375*9 + 0.375*-9 + 0.125*0 = 0
        expect(path[2]).toEqual({ x: 4.5, y: 0 });
    });
});

describe('pathAnimation', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        timerPoolUnsubscribeAll();
    });

    it('handles empty path by immediately completing', () => {
        let completed = false;
        const cancel = pathAnimation([], 100, () => {}, () => { completed = true; });
        expect(completed).toBe(true);
        expect(typeof cancel).toBe('function');
    });

    it('handles single-point path by immediately emitting and completing', () => {
        let completed = false;
        const frames: Vec2[] = [];
        const cancel = pathAnimation(
            [{ x: 5, y: 10 }],
            100,
            pos => frames.push(pos),
            () => { completed = true; }
        );
        expect(frames).toEqual([{ x: 5, y: 10 }]);
        expect(completed).toBe(true);
        expect(typeof cancel).toBe('function');
    });

    it('respects NO_MOTION by jumping to the end immediately without loops', async () => {
        vi.stubEnv('NO_MOTION', '1');
        vi.stubEnv('CI', '');
        vi.resetModules();

        const { pathAnimation: freshPathAnimation } = await import('./vectors.js');

        const path = [
            { x: 0, y: 0 },
            { x: 10, y: 20 },
            { x: 20, y: 40 }
        ];

        const frames: Vec2[] = [];
        let completed = false;

        freshPathAnimation(
            path,
            { durationMs: 500, loop: true },
            pos => frames.push(pos),
            () => { completed = true; }
        );

        expect(frames).toEqual([{ x: 20, y: 40 }]);
        expect(completed).toBe(true);
    });

    it('smoothly traverses a multi-point path with standard transitions', async () => {
        vi.useFakeTimers();

        const path = [
            { x: 0, y: 0 },
            { x: 10, y: 0 }, // dist = 10
            { x: 10, y: 10 } // dist = 10, total = 20
        ];

        const frames: Vec2[] = [];
        let completed = false;

        pathAnimation(
            path,
            1000,
            pos => frames.push({ x: Math.round(pos.x), y: Math.round(pos.y) }),
            () => { completed = true; },
            { easing: easings.linear }
        );

        // Advance 16ms to fire the first tick
        await advanceTime(16);
        expect(frames.length).toBeGreaterThan(0);
        expect(frames[0]).toEqual({ x: 0, y: 0 });

        // Advance 250ms (t = 0.25, total length = 20, target length = 5, should be half-way in segment 1)
        await advanceTime(250 - 16);
        expect(frames[frames.length - 1]).toEqual({ x: 5, y: 0 });

        // Advance 500ms (t = 0.5, target length = 10, should be at point 1)
        await advanceTime(250);
        expect(frames[frames.length - 1]).toEqual({ x: 10, y: 0 });

        // Advance 750ms (t = 0.75, target length = 15, should be half-way in segment 2)
        await advanceTime(250);
        expect(frames[frames.length - 1]).toEqual({ x: 10, y: 5 });

        // Advance to the end
        await advanceTime(250);
        expect(frames[frames.length - 1]).toEqual({ x: 10, y: 10 });
        expect(completed).toBe(true);
    });

    it('correctly handles zero-length segments in a path', async () => {
        vi.useFakeTimers();

        const path = [
            { x: 5, y: 5 },
            { x: 5, y: 5 },
            { x: 10, y: 5 }
        ];

        const frames: Vec2[] = [];
        pathAnimation(
            path,
            1000,
            pos => frames.push({ x: Math.round(pos.x), y: Math.round(pos.y) }),
            () => {},
            { easing: easings.linear }
        );

        await advanceTime(16);

        await advanceTime(500 - 16); // half-way
        expect(frames[frames.length - 1]).toEqual({ x: 8, y: 5 });

        await advanceTime(500); // end
        expect(frames[frames.length - 1]).toEqual({ x: 10, y: 5 });
    });

    it('supports constant speed calculations instead of durationMs', async () => {
        vi.useFakeTimers();

        const path = [
            { x: 0, y: 0 },
            { x: 10, y: 0 }, // dist = 10
            { x: 10, y: 10 } // dist = 10, total = 20
        ];

        const frames: Vec2[] = [];
        let completed = false;

        // Speed is 10 units per second, total distance is 20, so duration should be 2 seconds (2000ms)
        pathAnimation(
            path,
            { speed: 10, easing: easings.linear },
            pos => frames.push({ x: Math.round(pos.x), y: Math.round(pos.y) }),
            () => { completed = true; }
        );

        await advanceTime(16);
        expect(frames[0]).toEqual({ x: 0, y: 0 });

        // Half way (1 second)
        await advanceTime(1000 - 16);
        expect(frames[frames.length - 1]).toEqual({ x: 10, y: 0 });

        // End (2 seconds)
        await advanceTime(1000);
        expect(frames[frames.length - 1]).toEqual({ x: 10, y: 10 });
        expect(completed).toBe(true);
    });

    it('loops and alternates correctly along the path', async () => {
        vi.useFakeTimers();

        const path = [
            { x: 0, y: 0 },
            { x: 10, y: 10 } // dist = 14.14
        ];

        const frames: Vec2[] = [];

        const cancel = pathAnimation(
            path,
            { durationMs: 1000, loop: true, alternate: true, easing: easings.linear },
            pos => frames.push({ x: Math.round(pos.x), y: Math.round(pos.y) })
        );

        await advanceTime(16);
        expect(frames[0]).toEqual({ x: 0, y: 0 });

        // End of first iteration (t = 1) -> starts reversed path
        await advanceTime(1000 - 16);
        expect(frames[frames.length - 1]).toEqual({ x: 10, y: 10 });

        // Half way back (total elapsed 1500ms, should be halfway back to start)
        await advanceTime(500);
        expect(frames[frames.length - 1]).toEqual({ x: 5, y: 5 });

        // All the way back (total elapsed 2000ms)
        await advanceTime(500);
        expect(frames[frames.length - 1]).toEqual({ x: 0, y: 0 });

        cancel();
    });
});
