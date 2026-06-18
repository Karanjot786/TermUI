import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
    runEffects,
    destroyFiber,
    type Fiber,
} from '../hooks.js';

import { EventEmitter } from '@termuijs/core';
import { setCurrentApp } from '../runtime.js';
import { useTerminalSize } from './useTerminalSize.js';

describe('useTerminalSize', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
        setCurrentApp(null);
    });

    function createApp(cols = 80, rows = 24) {
        return {
            terminal: {
                cols,
                rows,
            },
            events: new EventEmitter(),
        };
    }

    it('returns safe defaults when no app is mounted', () => {
        setCurrentApp(null);

        const size = useTerminalSize();

        expect(size).toEqual({
            cols: 0,
            rows: 0,
        });
    });

    it('returns current terminal size', () => {
        const app = createApp(120, 40);

        setCurrentApp(app as any);

        const size = useTerminalSize();

        expect(size).toEqual({
            cols: 120,
            rows: 40,
        });
    });

    it('updates when resize event is emitted', () => {
        const app = createApp(80, 24);

        setCurrentApp(app as any);

        useTerminalSize();
        runEffects(fiber);

        app.events.emit('resize', {
            cols: 100,
            rows: 50,
        });

        const stateHook = fiber.hooks.find(
            (h: any) => h?.value?.cols !== undefined,
        );

        expect(stateHook?.value).toEqual({
            cols: 100,
            rows: 50,
        });
    });

    it('removes subscription on unmount', () => {
        const app = createApp();

        setCurrentApp(app as any);

        useTerminalSize();
        runEffects(fiber);

        expect(app.events.hasListeners('resize')).toBe(true);

        destroyFiber(fiber);

        expect(app.events.hasListeners('resize')).toBe(false);
    });
});