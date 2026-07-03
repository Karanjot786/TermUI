import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender } from '../hooks.js';
import { useBell } from './useBell.js';

describe('useBell', () => {
    let fiber = createFiber();

    beforeEach(() => {
        fiber = createFiber();
        setRequestRender(() => {});
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('returns a function that calls bell()', () => {
        const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

        const triggerBell = useBell();
        triggerBell();

        expect(spy).toHaveBeenCalledWith('\x07');

        spy.mockRestore();
    });
});
