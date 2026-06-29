// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for useKeyboardNavigation hook
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { caps, createKeyEvent } from '@termuijs/core';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender } from '../hooks.js';
import { useKeyboardNavigation } from './useKeyboardNavigation.js';

function mockKeyEvent(key: string, shift = false) {
    return createKeyEvent({
        key,
        raw: Buffer.alloc(0),
        ctrl: false,
        alt: false,
        shift,
    });
}

describe('useKeyboardNavigation', () => {
    let fiber = createFiber();

    beforeEach(() => {
        fiber = createFiber();
        setRequestRender(() => {});
    });

    afterEach(() => {
        clearCurrentFiber();
        vi.restoreAllMocks();
    });

    const renderHook = (opts: Parameters<typeof useKeyboardNavigation>[0]) => {
        setCurrentFiber(fiber);
        const res = useKeyboardNavigation(opts);
        clearCurrentFiber();
        return res;
    };

    it('initializes with selectedIndex 0', () => {
        const result = renderHook({ itemCount: 5 });
        expect(result.selectedIndex).toBe(0);
    });

    it('moves selection down and up with arrow keys', () => {
        let result = renderHook({ itemCount: 5 });

        // Simulate press down -> expect 1
        fiber.onInput?.(mockKeyEvent('down'));
        result = renderHook({ itemCount: 5 });
        expect(result.selectedIndex).toBe(1);

        // Simulate press down again -> expect 2
        fiber.onInput?.(mockKeyEvent('down'));
        result = renderHook({ itemCount: 5 });
        expect(result.selectedIndex).toBe(2);

        // Simulate press up -> expect 1
        fiber.onInput?.(mockKeyEvent('up'));
        result = renderHook({ itemCount: 5 });
        expect(result.selectedIndex).toBe(1);
    });

    it('jumps to first and last items with Home/End keys', () => {
        let result = renderHook({ itemCount: 10 });

        // End key -> expect 9
        fiber.onInput?.(mockKeyEvent('end'));
        result = renderHook({ itemCount: 10 });
        expect(result.selectedIndex).toBe(9);

        // Home key -> expect 0
        fiber.onInput?.(mockKeyEvent('home'));
        result = renderHook({ itemCount: 10 });
        expect(result.selectedIndex).toBe(0);
    });

    it('jumps by pageSize with PageUp/PageDown keys', () => {
        let result = renderHook({ itemCount: 25, pageSize: 5 });

        // PageDown -> expect 5
        fiber.onInput?.(mockKeyEvent('pagedown'));
        result = renderHook({ itemCount: 25, pageSize: 5 });
        expect(result.selectedIndex).toBe(5);

        // PageDown again -> expect 10
        fiber.onInput?.(mockKeyEvent('pagedown'));
        result = renderHook({ itemCount: 25, pageSize: 5 });
        expect(result.selectedIndex).toBe(10);

        // PageUp -> expect 5
        fiber.onInput?.(mockKeyEvent('pageup'));
        result = renderHook({ itemCount: 25, pageSize: 5 });
        expect(result.selectedIndex).toBe(5);
    });

    it('wraps around boundaries when loop is true', () => {
        let result = renderHook({ itemCount: 3, loop: true });

        // Up on index 0 wraps to 2
        fiber.onInput?.(mockKeyEvent('up'));
        result = renderHook({ itemCount: 3, loop: true });
        expect(result.selectedIndex).toBe(2);

        // Down on index 2 wraps to 0
        fiber.onInput?.(mockKeyEvent('down'));
        result = renderHook({ itemCount: 3, loop: true });
        expect(result.selectedIndex).toBe(0);
    });

    it('clamps to boundaries when loop is false', () => {
        let result = renderHook({ itemCount: 3, loop: false });

        // Up on index 0 clamps to 0
        fiber.onInput?.(mockKeyEvent('up'));
        result = renderHook({ itemCount: 3, loop: false });
        expect(result.selectedIndex).toBe(0);

        // Advance to last index
        fiber.onInput?.(mockKeyEvent('end'));
        result = renderHook({ itemCount: 3, loop: false });
        expect(result.selectedIndex).toBe(2);

        // Down on index 2 clamps to 2
        fiber.onInput?.(mockKeyEvent('down'));
        result = renderHook({ itemCount: 3, loop: false });
        expect(result.selectedIndex).toBe(2);
    });

    it('triggers onSelect callback on Enter key press', () => {
        const onSelect = vi.fn();
        let result = renderHook({ itemCount: 5, onSelect });

        // Advance index to 3
        fiber.onInput?.(mockKeyEvent('down'));
        fiber.onInput?.(mockKeyEvent('down'));
        fiber.onInput?.(mockKeyEvent('down'));
        result = renderHook({ itemCount: 5, onSelect });

        // Press enter -> expect onSelect to be called with 3
        fiber.onInput?.(mockKeyEvent('enter'));
        expect(onSelect).toHaveBeenCalledWith(3);
    });

    it('does nothing on key events when itemCount is 0', () => {
        let result = renderHook({ itemCount: 0 });

        fiber.onInput?.(mockKeyEvent('down'));
        result = renderHook({ itemCount: 0 });
        expect(result.selectedIndex).toBe(0);

        fiber.onInput?.(mockKeyEvent('end'));
        result = renderHook({ itemCount: 0 });
        expect(result.selectedIndex).toBe(0);
    });

    it('supports emacs ctrl+p / ctrl+n navigation when keybindingMode=emacs', () => {
        const spy = vi.spyOn(caps, 'keybindingMode', 'get').mockReturnValue('emacs');
        try {
            let result = renderHook({ itemCount: 3, loop: true });

            // Ctrl+P should behave like 'up' (wraps from 0 -> 2)
            fiber.onInput?.(createKeyEvent({ key: 'p', raw: Buffer.alloc(0), ctrl: true, alt: false, shift: false }));
            result = renderHook({ itemCount: 3, loop: true });
            expect(result.selectedIndex).toBe(2);

            // Ctrl+N should behave like 'down' (2 -> 0)
            fiber.onInput?.(createKeyEvent({ key: 'n', raw: Buffer.alloc(0), ctrl: true, alt: false, shift: false }));
            result = renderHook({ itemCount: 3, loop: true });
            expect(result.selectedIndex).toBe(0);
        } finally {
            spy.mockRestore();
        }
    });
});
