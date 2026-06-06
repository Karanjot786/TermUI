import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
    runEffects,
} from '../hooks.js';
import { setCurrentApp } from '../runtime.js';
import { useMediaQuery } from './useMediaQuery.js';

describe('useMediaQuery', () => {
    let fiber: ReturnType<typeof createFiber>;

    beforeEach(() => {
        fiber = createFiber();
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
        setCurrentApp(null);
    });

    it('returns true when min-width matches', () => {
        const mockApp = {
            terminal: {
                cols: 120,
                rows: 40,
                onResize: () => () => {},
            },
        };

        setCurrentApp(
          mockApp as Parameters<typeof setCurrentApp>[0], // test-only partial app shape for useMediaQuery
        );

        expect(useMediaQuery('(min-width: 100)')).toBe(true);
    });

    it('returns false when min-width does not match', () => {
        const mockApp = {
            terminal: {
                cols: 80,
                rows: 40,
                onResize: () => () => {},
            },
        };

        setCurrentApp(
          mockApp as Parameters<typeof setCurrentApp>[0], // test-only partial app shape for useMediaQuery
        );

        expect(useMediaQuery('(min-width: 100)')).toBe(false);
    });

    it('supports max-width queries', () => {
        const mockApp = {
            terminal: {
                cols: 80,
                rows: 40,
                onResize: () => () => {},
            },
        };

        setCurrentApp(
          mockApp as Parameters<typeof setCurrentApp>[0], // test-only partial app shape for useMediaQuery
        );

        expect(useMediaQuery('(max-width: 100)')).toBe(true);
    });

    it('supports height queries', () => {
        const mockApp = {
            terminal: {
                cols: 80,
                rows: 50,
                onResize: () => () => {},
            },
        };

        setCurrentApp(
          mockApp as Parameters<typeof setCurrentApp>[0], // test-only partial app shape for useMediaQuery
        );

        expect(useMediaQuery('(min-height: 40)')).toBe(true);
        expect(useMediaQuery('(max-height: 60)')).toBe(true);
    });

    it('updates when terminal is resized', () => {
    let resizeHandler: ((cols: number, rows: number) => void) | undefined;

    const mockApp = {
        terminal: {
            cols: 80,
            rows: 40,
            onResize: (handler: (cols: number, rows: number) => void) => {
                resizeHandler = handler;
                return () => {};
            },
        },
    };

    setCurrentApp(
        mockApp as Parameters<typeof setCurrentApp>[0], // test-only partial app shape for useMediaQuery
    );

    expect(useMediaQuery('(min-width: 100)')).toBe(false);

    runEffects(fiber);

    resizeHandler?.(120, 40);

    fiber.hookIndex = 0;

    expect(useMediaQuery('(min-width: 100)')).toBe(true);
   });
});