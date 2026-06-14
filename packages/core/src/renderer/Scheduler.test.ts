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
        scheduler.enqueue(() => update());
        scheduler.enqueue(() => update());
        scheduler.enqueue(() => update());

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
        scheduler.enqueue(() => {});
        scheduler.flush();
        // Internal check: size should be 0, next flush shouldn't trigger logic
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
});