import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
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

        setCurrentApp(mockApp as any);

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

        setCurrentApp(mockApp as any);

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

        setCurrentApp(mockApp as any);

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

        setCurrentApp(mockApp as any);

        expect(useMediaQuery('(min-height: 40)')).toBe(true);
        expect(useMediaQuery('(max-height: 60)')).toBe(true);
    });
});