import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearCurrentFiber,
    createFiber,
    destroyFiber,
    runEffects,
    setCurrentFiber,
    setRequestRender,
    type Fiber,
} from '../hooks.js';
import { useViewMeta } from './useViewMeta.js';

describe('useViewMeta', () => {
    let fiber: Fiber | null;
    let writeSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        fiber = createFiber();
        setCurrentFiber(fiber);
        setRequestRender(vi.fn());
        writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        if (fiber) {
            destroyFiber(fiber);
        }
        clearCurrentFiber();
        vi.restoreAllMocks();
    });

    it('sets the window title', () => {
        if (!fiber) {
            throw new Error('Expected fiber');
        }

        useViewMeta({ title: 'My App' });
        runEffects(fiber);

        expect(writeSpy).toHaveBeenCalledWith('\x1b]0;My App\x07');
    });

    it('sets the cursor shape', () => {
        if (!fiber) {
            throw new Error('Expected fiber');
        }

        useViewMeta({ cursor: 'block' });
        runEffects(fiber);
        expect(writeSpy).toHaveBeenLastCalledWith('\x1b[2 q');

        fiber.hookIndex = 0;
        useViewMeta({ cursor: 'underline' });
        runEffects(fiber);
        expect(writeSpy).toHaveBeenLastCalledWith('\x1b[4 q');

        fiber.hookIndex = 0;
        useViewMeta({ cursor: 'bar' });
        runEffects(fiber);
        expect(writeSpy).toHaveBeenLastCalledWith('\x1b[6 q');
    });

    it('sets the mouse mode', () => {
        if (!fiber) {
            throw new Error('Expected fiber');
        }

        useViewMeta({ mouseMode: 'none' });
        runEffects(fiber);
        expect(writeSpy).toHaveBeenLastCalledWith('\x1b[?1000l\x1b[?1003l\x1b[?1015l\x1b[?1006l');

        fiber.hookIndex = 0;
        useViewMeta({ mouseMode: 'click' });
        runEffects(fiber);
        expect(writeSpy).toHaveBeenLastCalledWith('\x1b[?1000h\x1b[?1006h');

        fiber.hookIndex = 0;
        useViewMeta({ mouseMode: 'drag' });
        runEffects(fiber);
        expect(writeSpy).toHaveBeenLastCalledWith('\x1b[?1000h\x1b[?1002h\x1b[?1006h');
    });

    it('restores defaults on unmount', () => {
        if (!fiber) {
            throw new Error('Expected fiber');
        }

        useViewMeta({ title: 'My App', cursor: 'bar', mouseMode: 'click' });
        runEffects(fiber);
        writeSpy.mockClear();

        destroyFiber(fiber);
        fiber = null;

        expect(writeSpy).toHaveBeenNthCalledWith(1, '\x1b]0;\x07');
        expect(writeSpy).toHaveBeenNthCalledWith(2, '\x1b[0 q');
        expect(writeSpy).toHaveBeenNthCalledWith(3, '\x1b[?1000l\x1b[?1003l\x1b[?1015l\x1b[?1006l');
    });

    it('restores only metadata fields that were set', () => {
        if (!fiber) {
            throw new Error('Expected fiber');
        }

        useViewMeta({ title: 'Details' });
        runEffects(fiber);
        writeSpy.mockClear();

        destroyFiber(fiber);
        fiber = null;

        expect(writeSpy).toHaveBeenCalledTimes(1);
        expect(writeSpy).toHaveBeenCalledWith('\x1b]0;\x07');
    });

    it('does not write on mount or unmount when no metadata is set', () => {
        if (!fiber) {
            throw new Error('Expected fiber');
        }

        useViewMeta({});
        runEffects(fiber);

        expect(writeSpy).not.toHaveBeenCalled();

        destroyFiber(fiber);
        fiber = null;

        expect(writeSpy).not.toHaveBeenCalled();
    });
});
