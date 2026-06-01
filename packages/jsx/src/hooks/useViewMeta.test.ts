// ─────────────────────────────────────────────────────
// Tests — useViewMeta hook
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, runEffects, destroyFiber } from '../hooks.js';
import { useViewMeta } from './useViewMeta.js';

describe('useViewMeta hook', () => {
    let writeSpy: any;

    beforeEach(() => {
        writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        writeSpy.mockRestore();
        clearCurrentFiber();
    });

    it('sets terminal window title, cursor shape, and mouse mode on mount', () => {
        const fiber = createFiber();
        setCurrentFiber(fiber);
        useViewMeta({ title: 'My App', cursor: 'bar', mouseMode: 'click' });
        clearCurrentFiber();

        runEffects(fiber);

        // Check title ESC]0;title BEL
        expect(writeSpy).toHaveBeenCalledWith('\x1b]0;My App\x07');
        // Check cursor shape (6 q for bar)
        expect(writeSpy).toHaveBeenCalledWith('\x1b[6 q');
        // Check mouse mode (click tracking enabled, drag tracking disabled)
        expect(writeSpy).toHaveBeenCalledWith('\x1b[?1002l\x1b[?1000h\x1b[?1006h');

        destroyFiber(fiber);
    });

    it('sets correct cursor shapes', () => {
        // Test block shape (2 q)
        const fiberBlock = createFiber();
        setCurrentFiber(fiberBlock);
        useViewMeta({ cursor: 'block' });
        clearCurrentFiber();
        runEffects(fiberBlock);
        expect(writeSpy).toHaveBeenCalledWith('\x1b[2 q');
        destroyFiber(fiberBlock);

        // Test underline shape (4 q)
        writeSpy.mockClear();
        const fiberUnderline = createFiber();
        setCurrentFiber(fiberUnderline);
        useViewMeta({ cursor: 'underline' });
        clearCurrentFiber();
        runEffects(fiberUnderline);
        expect(writeSpy).toHaveBeenCalledWith('\x1b[4 q');
        destroyFiber(fiberUnderline);
    });

    it('sets correct mouse tracking modes', () => {
        // Test none mode (disable tracking)
        const fiberNone = createFiber();
        setCurrentFiber(fiberNone);
        useViewMeta({ mouseMode: 'none' });
        clearCurrentFiber();
        runEffects(fiberNone);
        expect(writeSpy).toHaveBeenCalledWith('\x1b[?1000l\x1b[?1002l\x1b[?1006l');
        destroyFiber(fiberNone);

        // Test drag mode (enable drag)
        writeSpy.mockClear();
        const fiberDrag = createFiber();
        setCurrentFiber(fiberDrag);
        useViewMeta({ mouseMode: 'drag' });
        clearCurrentFiber();
        runEffects(fiberDrag);
        expect(writeSpy).toHaveBeenCalledWith('\x1b[?1000l\x1b[?1002h\x1b[?1006h');
        destroyFiber(fiberDrag);
    });

    it('restores all defaults on component unmount', () => {
        const fiber = createFiber();
        setCurrentFiber(fiber);
        useViewMeta({ title: 'My App', cursor: 'bar', mouseMode: 'click' });
        clearCurrentFiber();

        runEffects(fiber);
        writeSpy.mockClear();

        // Unmount
        destroyFiber(fiber);

        // Check restoration escape sequences
        expect(writeSpy).toHaveBeenCalledWith('\x1b]0;\x07'); // empty title
        expect(writeSpy).toHaveBeenCalledWith('\x1b[0 q');   // default cursor shape
        expect(writeSpy).toHaveBeenCalledWith('\x1b[?1000l\x1b[?1002l\x1b[?1006l'); // disabled mouse tracking
    });

    it('does not write redundant escape sequences on update', () => {
        const fiber = createFiber();

        // First render
        setCurrentFiber(fiber);
        useViewMeta({ title: 'My App', cursor: 'bar', mouseMode: 'click' });
        clearCurrentFiber();
        runEffects(fiber);

        writeSpy.mockClear();

        // Re-render with same options
        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        useViewMeta({ title: 'My App', cursor: 'bar', mouseMode: 'click' });
        clearCurrentFiber();
        runEffects(fiber);

        // Should not write anything because options did not change
        expect(writeSpy).not.toHaveBeenCalled();

        // Re-render with a new title
        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        useViewMeta({ title: 'New App', cursor: 'bar', mouseMode: 'click' });
        clearCurrentFiber();
        // Since deps changed, the previous cleanup runs, then the new effect runs
        runEffects(fiber);

        expect(writeSpy).toHaveBeenCalledWith('\x1b]0;New App\x07');

        destroyFiber(fiber);
    });
});
