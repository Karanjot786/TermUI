import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender } from '../hooks.js';
import { useBell } from './useBell.js';
import * as core from '@termuijs/core';

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
        const spy = vi.spyOn(core, 'bell').mockImplementation(() => {});
        
        const triggerBell = useBell();
        triggerBell();
        
        expect(spy).toHaveBeenCalled();
        
        spy.mockRestore();
    });
});
