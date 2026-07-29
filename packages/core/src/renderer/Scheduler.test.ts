import process from 'node:process';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Scheduler } from './Scheduler.js';

describe('Scheduler', () => {
    let scheduler: Scheduler;

    beforeEach(() => {
        vi.useFakeTimers();
        scheduler = new Scheduler();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('should not execute tasks immediately upon enqueue', () => {
        let executed = false;
        scheduler.enqueue(() => { executed = true; });

        expect(executed).toBe(false);
    });

    it('should batch multiple updates into a single flush pass', () => {
        let callCount = 0;
        const update = () => { callCount++; };

        // Simulate 3 rapid state updates from different hooks
        scheduler.enqueue(update);
        scheduler.enqueue(update);
        scheduler.enqueue(update);

        // Fast-forward past the 30 FPS window (~33ms)
        vi.advanceTimersByTime(34);

        // All updates should have run, but they were triggered by one timer
        expect(callCount).toBe(3);
    });

    it('should respect custom FPS settings for frame windows', () => {
        let executed = false;
        scheduler.setFPS(10); // 100ms windows
        scheduler.enqueue(() => { executed = true; });

        vi.advanceTimersByTime(50);
        expect(executed).toBe(false);

        vi.advanceTimersByTime(51);
        expect(executed).toBe(true);
    });

    it('should clear the queue after flushing', () => {
        let count = 0;
        scheduler.enqueue(() => { count++; });

        scheduler.flush();
        expect(count).toBe(1);

        // Verify queue is empty and timer is cancelled by ensuring
        // neither manual flush nor advancing time triggers the task again.
        scheduler.flush();
        vi.advanceTimersByTime(34);
        expect(count).toBe(1);
    });

    it('should continue executing remaining tasks if one task throws an error', () => {
        let executed = false;

        // Mock stderr to prevent test output pollution
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

        scheduler.enqueue(() => { throw new Error('Boom'); });
        scheduler.enqueue(() => { executed = true; });

        scheduler.flush();

        expect(executed).toBe(true);
        expect(stderrSpy).toHaveBeenCalled();
    });

    it('should not deduplicate identical function references', () => {
        let count = 0;
        const task = () => { count++; };

        scheduler.enqueue(task);
        scheduler.enqueue(task);

        scheduler.flush();
        expect(count).toBe(2);
    });

    it('should throw an error for invalid FPS values', () => {
        expect(() => scheduler.setFPS(0)).toThrow();
        expect(() => scheduler.setFPS(-10)).toThrow();
        expect(() => scheduler.setFPS(NaN)).toThrow();
        expect(() => scheduler.setFPS(Infinity)).toThrow();
    });

    it('should prevent re-entrant flush and defer tasks enqueued during flush to the next frame', () => {
        // This test would pass WITHOUT _isFlushing IF the nested flush() ran inline:
        // the follow-up task would be run by the nested flush, not the scheduled frame.
        // With the guard, nested flush() is a no-op, and the follow-up task is scheduled
        // via scheduleFrame() in the finally block, then runs on the next timer tick.
        const executionOrder: string[] = [];

        scheduler.enqueue(() => {
            executionOrder.push('task1');
            // Enqueue a follow-up task and attempt a nested flush during the outer flush
            scheduler.enqueue(() => { executionOrder.push('followup'); });
            scheduler.flush(); // Must be a no-op while _isFlushing === true
            executionOrder.push('task1-after-nested-flush');
        });

        scheduler.flush();

        // After the outer flush completes: task1 and task1-after-nested-flush ran;
        // the follow-up was scheduled (not run inline) because the nested flush was blocked.
        expect(executionOrder).toEqual(['task1', 'task1-after-nested-flush']);

        // Advance fake timers to let the scheduled follow-up frame execute (~33ms for 30fps)
        vi.advanceTimersByTime(34);

        expect(executionOrder).toEqual(['task1', 'task1-after-nested-flush', 'followup']);
    });

    it('should clear the timer handle before flushing so tasks enqueued during flush can schedule a new frame', () => {
        // This validates the _timer = null fix in scheduleFrame's callback.
        // Without the fix, the stale timer handle is non-null after the timeout fires,
        // causing scheduleFrame() to return early and strand follow-up tasks enqueued
        // during a timer-driven flush.
        const results: string[] = [];

        // Force a timer-driven flush by just enqueueing (not calling flush() directly)
        scheduler.enqueue(() => {
            results.push('initial-task');
            // Enqueue another task during this timer-driven flush
            scheduler.enqueue(() => { results.push('followup-task'); });
        });

        // Advance fake timers to trigger the first timer-driven flush (~33ms for 30fps)
        vi.advanceTimersByTime(34);
        expect(results).toContain('initial-task');

        // followup-task should now be scheduled; advance again to run it
        vi.advanceTimersByTime(34);
        expect(results).toContain('followup-task');
    });
});
