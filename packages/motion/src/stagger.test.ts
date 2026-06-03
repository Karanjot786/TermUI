import { describe, it, expect, vi, afterEach } from 'vitest';
import { stagger } from './stagger.js';
import { sequence, type AnimationRunner } from './sequence.js';
import * as sequencing from './sequence.js';
import { timerPoolUnsubscribeAll } from './index.js';

describe('stagger()', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        timerPoolUnsubscribeAll();
    });

    it('stagger starts animations with per-item delay offsets', () => {
        vi.useFakeTimers();

        const starts: number[] = [];
        const onComplete = vi.fn();
        const animations: AnimationRunner[] = [
            done => { starts.push(1); done(); return () => {}; },
            done => { starts.push(2); done(); return () => {}; },
            done => { starts.push(3); done(); return () => {}; },
        ];

        stagger(animations, 100, onComplete);

        expect(starts).toEqual([1]);
        expect(onComplete).not.toHaveBeenCalled();

        vi.advanceTimersByTime(99);
        expect(starts).toEqual([1]);

        vi.advanceTimersByTime(1);
        expect(starts).toEqual([1, 2]);

        vi.advanceTimersByTime(100);
        expect(starts).toEqual([1, 2, 3]);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('handles empty input without throwing', () => {
        const onComplete = vi.fn();
        expect(() => stagger([], 100, onComplete)).not.toThrow();
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('starts all animations immediately for zero delay', () => {
        const starts: number[] = [];
        const onComplete = vi.fn();
        const animations: AnimationRunner[] = [
            done => { starts.push(1); done(); return () => {}; },
            done => { starts.push(2); done(); return () => {}; },
            done => { starts.push(3); done(); return () => {}; },
        ];

        stagger(animations, 0, onComplete);

        expect(starts).toEqual([1, 2, 3]);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('single animation starts immediately even with delay', () => {
        vi.useFakeTimers();

        const starts: number[] = [];
        const onComplete = vi.fn();
        const animation: AnimationRunner = done => {
            starts.push(1);
            done();
            return () => {};
        };

        stagger([animation], 250, onComplete);

        expect(starts).toEqual([1]);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('handles empty array as a boundary value', () => {
        const onComplete = vi.fn();
        const cancel = stagger([], 0, onComplete);

        expect(typeof cancel).toBe('function');
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('is compatible with existing sequence API', () => {
        vi.useFakeTimers();

        const order: string[] = [];
        const onComplete = vi.fn();

        const a1: AnimationRunner = done => { order.push('a1'); done(); return () => {}; };
        const a2: AnimationRunner = done => { order.push('a2'); done(); return () => {}; };
        const b1: AnimationRunner = done => { order.push('b1'); done(); return () => {}; };

        const staggerGroup: AnimationRunner = done => stagger([a1, a2], 100, done);
        sequence([staggerGroup, b1], onComplete);

        expect(order).toEqual(['a1']);
        vi.advanceTimersByTime(100);
        expect(order).toEqual(['a1', 'a2', 'b1']);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('reuses parallel primitive internally', () => {
        const parallelSpy = vi.spyOn(sequencing, 'parallel');
        const animation: AnimationRunner = done => { done(); return () => {}; };

        stagger([animation], 50);

        expect(parallelSpy).toHaveBeenCalledTimes(1);
    });
});
