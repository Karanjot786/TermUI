import { describe, it, expect, vi } from 'vitest';
import { sequence, parallel, type AnimationRunner } from './sequence.js';

describe('sequence()', () => {
    it('handles an empty list of animations immediately', () => {
        const onComplete = vi.fn();
        const cancel = sequence([], onComplete);

        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(typeof cancel).toBe('function');
    });

    it('runs synchronous animations in exact sequential order', () => {
        const order: number[] = [];
        const onComplete = vi.fn();

        const anim1: AnimationRunner = (done) => {
            order.push(1);
            done();
            return () => {};
        };
        const anim2: AnimationRunner = (done) => {
            order.push(2);
            done();
            return () => {};
        };
        const anim3: AnimationRunner = (done) => {
            order.push(3);
            done();
            return () => {};
        };

        sequence([anim1, anim2, anim3], onComplete);

        expect(order).toEqual([1, 2, 3]);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('runs asynchronous animations only after prior ones finish', () => {
        const order: string[] = [];
        const onComplete = vi.fn();
        let trigger1: () => void = () => {};
        let trigger2: () => void = () => {};

        const anim1: AnimationRunner = (done) => {
            order.push('start1');
            trigger1 = () => {
                order.push('done1');
                done();
            };
            return () => {};
        };

        const anim2: AnimationRunner = (done) => {
            order.push('start2');
            trigger2 = () => {
                order.push('done2');
                done();
            };
            return () => {};
        };

        sequence([anim1, anim2], onComplete);

        expect(order).toEqual(['start1']);
        expect(onComplete).not.toHaveBeenCalled();

        // Trigger first animation
        trigger1();
        expect(order).toEqual(['start1', 'done1', 'start2']);
        expect(onComplete).not.toHaveBeenCalled();

        // Trigger second animation
        trigger2();
        expect(order).toEqual(['start1', 'done1', 'start2', 'done2']);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('cancels the current animation and prevents subsequent ones', () => {
        const order: string[] = [];
        const onComplete = vi.fn();
        const cancelSpy1 = vi.fn();
        const cancelSpy2 = vi.fn();

        const anim1: AnimationRunner = (done) => {
            order.push('start1');
            return cancelSpy1;
        };
        const anim2: AnimationRunner = (done) => {
            order.push('start2');
            return cancelSpy2;
        };

        const cancelMaster = sequence([anim1, anim2], onComplete);

        expect(order).toEqual(['start1']);

        // Cancel the master sequence
        cancelMaster();

        expect(cancelSpy1).toHaveBeenCalledTimes(1);
        expect(cancelSpy2).not.toHaveBeenCalled();
        expect(order).toEqual(['start1']); // Anim2 never started
        expect(onComplete).not.toHaveBeenCalled();
    });
});

describe('parallel()', () => {
    it('handles an empty list of animations immediately', () => {
        const onComplete = vi.fn();
        const cancel = parallel([], onComplete);

        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(typeof cancel).toBe('function');
    });

    it('runs all animations concurrently', () => {
        const order: string[] = [];
        const onComplete = vi.fn();
        let trigger1: () => void = () => {};
        let trigger2: () => void = () => {};

        const anim1: AnimationRunner = (done) => {
            order.push('start1');
            trigger1 = done;
            return () => {};
        };
        const anim2: AnimationRunner = (done) => {
            order.push('start2');
            trigger2 = done;
            return () => {};
        };

        parallel([anim1, anim2], onComplete);

        // Both should start immediately
        expect(order).toEqual(['start1', 'start2']);
        expect(onComplete).not.toHaveBeenCalled();

        // Finish first
        trigger1();
        expect(onComplete).not.toHaveBeenCalled();

        // Finish second
        trigger2();
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('cancels all active animations in the group', () => {
        const cancelSpy1 = vi.fn();
        const cancelSpy2 = vi.fn();

        const anim1: AnimationRunner = () => cancelSpy1;
        const anim2: AnimationRunner = () => cancelSpy2;

        const cancelMaster = parallel([anim1, anim2]);

        cancelMaster();

        expect(cancelSpy1).toHaveBeenCalledTimes(1);
        expect(cancelSpy2).toHaveBeenCalledTimes(1);
    });

    it('ignores late completion callbacks after cancellation', () => {
        const onComplete = vi.fn();
        let finish1: () => void = () => {};
        let finish2: () => void = () => {};

        const anim1: AnimationRunner = (done) => {
            finish1 = done;
            return () => {};
        };
        const anim2: AnimationRunner = (done) => {
            finish2 = done;
            return () => {};
        };

        const cancelMaster = parallel([anim1, anim2], onComplete);
        cancelMaster();

        finish1();
        finish2();

        expect(onComplete).not.toHaveBeenCalled();
    });
});
