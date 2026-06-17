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
});
