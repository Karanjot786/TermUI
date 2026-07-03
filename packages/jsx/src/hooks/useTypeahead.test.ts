// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for useTypeahead hook
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createKeyEvent } from '@termuijs/core';
import { createVirtualClock } from '../../../testing/src/index.js';
import { timerPoolSubscribe } from '@termuijs/motion';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender, runEffects } from '../hooks.js';
import { useTypeahead } from './useTypeahead.js';

function mockKeyEvent(key: string, ctrl = false, alt = false) {
    return createKeyEvent({
        key,
        raw: Buffer.alloc(0),
        ctrl,
        alt,
        shift: false,
    });
}

describe('useTypeahead', () => {
    let fiber = createFiber();
    let clock: ReturnType<typeof createVirtualClock>;
    let restoreClock: () => void;

    beforeEach(() => {
        fiber = createFiber();
        setRequestRender(() => {});
        clock = createVirtualClock();
        restoreClock = timerPoolSubscribe(clock);
    });

    afterEach(() => {
        clearCurrentFiber();
        vi.restoreAllMocks();
        restoreClock();
    });

    const renderHook = <T>(items: T[], getItemLabel: (item: T) => string, delayMs?: number) => {
        setCurrentFiber(fiber);
        const res = useTypeahead(items, getItemLabel, delayMs);
        clearCurrentFiber();
        runEffects(fiber);
        return res;
    };

    const fruits = ['apple', 'banana', 'apricot', 'cherry'];

    it('initializes with matchIndex -1', () => {
        const result = renderHook(fruits, (f) => f);
        expect(result).toBe(-1);
    });

    it('matches single character prefix case-insensitively', () => {
        let result = renderHook(fruits, (f) => f);
        expect(result).toBe(-1);

        // Type 'b' -> match banana (index 1)
        fiber.onInput?.(mockKeyEvent('b'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(1);

        // Type 'C' -> match cherry (index 3)
        // Wait, 'C' is a new prefix if we wait for reset, let's advance time first
        clock.advance(600);
        fiber.onInput?.(mockKeyEvent('C'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(3);
    });

    it('accumulates keypresses and matches multi-character prefix', () => {
        let result = renderHook(fruits, (f) => f);

        // Type 'a' -> matches 'apple' (index 0)
        fiber.onInput?.(mockKeyEvent('a'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(0);

        // Type 'p' -> prefix is 'ap', still matches 'apple' (index 0)
        fiber.onInput?.(mockKeyEvent('p'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(0);

        // Type 'r' -> prefix is 'apr', matches 'apricot' (index 2)
        fiber.onInput?.(mockKeyEvent('r'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(2);
    });

    it('resets buffer after inactivity delayMs', () => {
        let result = renderHook(fruits, (f) => f);

        // Type 'a' -> matches 'apple' (index 0)
        fiber.onInput?.(mockKeyEvent('a'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(0);

        // Advance clock past delayMs (default 500ms)
        clock.advance(600);

        // Type 'b' -> matches 'banana' (index 1) because buffer was reset
        fiber.onInput?.(mockKeyEvent('b'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(1);
    });

    it('ignores keys that create a prefix matching nothing', () => {
        let result = renderHook(fruits, (f) => f);

        // Type 'a' -> matches 'apple' (index 0)
        fiber.onInput?.(mockKeyEvent('a'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(0);

        // Type 'p' -> prefix 'ap' -> matches 'apple' (index 0)
        fiber.onInput?.(mockKeyEvent('p'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(0);

        // Type 'x' -> proposed prefix 'apx' has no match.
        // It should be ignored. The buffer should remain 'ap', and the match remains 'apple' (index 0)
        fiber.onInput?.(mockKeyEvent('x'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(0);

        // Type 'r' -> proposed prefix 'apr' (since 'x' was ignored) matches 'apricot' (index 2)
        fiber.onInput?.(mockKeyEvent('r'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(2);
    });

    it('ignores non-printable keys and modifier keys', () => {
        let result = renderHook(fruits, (f) => f);

        // Down arrow (non-printable) -> should be ignored
        fiber.onInput?.(mockKeyEvent('down'));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(-1);

        // Ctrl + 'a' -> should be ignored
        fiber.onInput?.(mockKeyEvent('a', true, false));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(-1);

        // Alt + 'b' -> should be ignored
        fiber.onInput?.(mockKeyEvent('b', false, true));
        result = renderHook(fruits, (f) => f);
        expect(result).toBe(-1);
    });

    it('handles empty items list safely', () => {
        let result = renderHook([], (f) => f);
        expect(result).toBe(-1);

        fiber.onInput?.(mockKeyEvent('a'));
        result = renderHook([], (f) => f);
        expect(result).toBe(-1);
    });
});
