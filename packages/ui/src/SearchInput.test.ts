// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for SearchInput
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Screen, caps, createKeyEvent } from '@termuijs/core';
import { SearchInput } from './SearchInput.js';

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

const renderRow = (screen: Screen, row: number): string =>
    screen.back[row].map(c => c.char).join('');

const typeChar = (key: string): ReturnType<typeof createKeyEvent> =>
    createKeyEvent({ key, raw: Buffer.from(key), ctrl: false, alt: false, shift: false });

describe('SearchInput', () => {
    it('renders the placeholder when empty', () => {
        const input = new SearchInput({ placeholder: 'Search files...' });
        input.updateRect({ x: 0, y: 0, width: 30, height: 1 });
        const screen = new Screen(30, 1);
        input.render(screen);

        const row = renderRow(screen, 0);
        expect(row).toContain('Search files...');
        expect(row).toMatch(/[/\u{1F50D}]/u);
    });

    it('debounces and fires onSearch after the debounce period', () => {
        vi.useFakeTimers();
        const onSearch = vi.fn();
        const input = new SearchInput({ debounce: 100, onSearch });
        input.handleKey(typeChar('a'));
        input.handleKey(typeChar('b'));
        input.handleKey(typeChar('c'));

        expect(onSearch).not.toHaveBeenCalled();
        vi.advanceTimersByTime(100);
        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith('abc');
    });

    it('resets the debounce timer on each keystroke', () => {
        vi.useFakeTimers();
        const onSearch = vi.fn();
        const input = new SearchInput({ debounce: 100, onSearch });
        input.handleKey(typeChar('a'));
        vi.advanceTimersByTime(80);
        input.handleKey(typeChar('b'));
        vi.advanceTimersByTime(80);
        // 80 + 80 = 160ms total, but the timer should have been reset
        expect(onSearch).not.toHaveBeenCalled();
        vi.advanceTimersByTime(20);
        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith('ab');
    });

    it('Escape clears the input and fires onSearch("")', () => {
        vi.useFakeTimers();
        const onSearch = vi.fn();
        const input = new SearchInput({ debounce: 50, onSearch });
        input.handleKey(typeChar('h'));
        input.handleKey(typeChar('i'));
        expect(input.value).toBe('hi');

        input.handleKey(createKeyEvent({
            key: 'escape',
            raw: Buffer.from('\x1b'),
            ctrl: false, alt: false, shift: false,
        }));
        expect(input.value).toBe('');

        // Escape fires immediately, before the debounce timer
        expect(onSearch).toHaveBeenCalledWith('');
    });

    it('backspace removes one grapheme at a time', () => {
        const input = new SearchInput();
        input.setValue('e\u0301👍🏽');

        input.handleKey(createKeyEvent({
            key: 'backspace',
            raw: Buffer.from('\b'),
            ctrl: false, alt: false, shift: false,
        }));

        expect(input.value).toBe('e\u0301');

        input.handleKey(createKeyEvent({
            key: 'backspace',
            raw: Buffer.from('\b'),
            ctrl: false, alt: false, shift: false,
        }));

        expect(input.value).toBe('');
    });

    it('uses ASCII icon when unicode is off and Unicode icon when on', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const asciiInput = new SearchInput({ placeholder: 'x' });
        asciiInput.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const asciiScreen = new Screen(20, 1);
        asciiInput.render(asciiScreen);
        expect(renderRow(asciiScreen, 0)).toContain('/');
        expect(renderRow(asciiScreen, 0)).not.toContain('🔍');

        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const unicodeInput = new SearchInput({ placeholder: 'x' });
        unicodeInput.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const unicodeScreen = new Screen(20, 1);
        unicodeInput.render(unicodeScreen);
        expect(renderRow(unicodeScreen, 0)).toContain('🔍');
    });

    it('respects padding — text starts after the padding offset, not at _rect.x', () => {
        // Without the fix, content would render at x=0 and overlap any border
        // drawn by the base Widget. With the fix, _getContentRect() shifts
        // the content to x=2 because of the left padding.
        const input = new SearchInput({ placeholder: 'padded' });
        input.setStyle({ padding: { left: 2, top: 0, right: 0, bottom: 0 } });
        input.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        input.render(screen);

        const row = screen.back[0];
        // The first two cells should be untouched (empty/padding)
        expect(row[0]?.char).toBe(' ');
        expect(row[1]?.char).toBe(' ');
        // The icon and placeholder should start at x=2
        expect(row[2]?.char).not.toBe(' ');
    });

        it('clears the debounce timer when destroyed to prevent memory leaks', () => {
        vi.useFakeTimers();
        const onSearch = vi.fn();
        const input = new SearchInput({ debounce: 100, onSearch });
        
        input.handleKey(typeChar('a'));
        
        // Destroy the component while the timer is still running
        input.destroy();
        
        vi.advanceTimersByTime(100);
        
        // The timer should have been cleared, so onSearch should NOT fire
        expect(onSearch).not.toHaveBeenCalled();
    });

});
