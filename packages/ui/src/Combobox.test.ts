// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Combobox widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps, type KeyEvent } from '@termuijs/core';
import { Combobox } from './Combobox.js';

function makeKey(key: string, overrides: Partial<KeyEvent> = {}): KeyEvent {
    return {
        key,
        shift: false,
        ctrl: false,
        alt: false,
        raw: Buffer.alloc(0),
        stopPropagation: () => {},
        preventDefault: () => {},
        ...overrides,
    };
}

describe('Combobox', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes with empty value and no selection', () => {
        const cb = new Combobox([
            { label: 'Apple', value: 'a' },
            { label: 'Banana', value: 'b' }
        ]);
        expect(cb.value).toBe('');
        expect(cb.filtered.length).toBe(2);
    });

    it('typing filters the option list', () => {
        const cb = new Combobox([
            { label: 'Apple', value: 'a' },
            { label: 'Banana', value: 'b' },
            { label: 'Apricot', value: 'ap' }
        ]);

        cb.handleKey(makeKey('a'));
        expect(cb.filtered.some(o => o.label === 'Apple')).toBe(true);
        expect(cb.filtered.some(o => o.label === 'Banana')).toBe(true);
        expect(cb.filtered.some(o => o.label === 'Apricot')).toBe(true);

        cb.handleKey(makeKey('p'));
        // query is "ap"
        expect(cb.filtered.some(o => o.label === 'Apple')).toBe(true);
        expect(cb.filtered.some(o => o.label === 'Banana')).toBe(false);
        expect(cb.filtered.some(o => o.label === 'Apricot')).toBe(true);
    });

    it('down then enter selects a filtered option', () => {
        const onSelect = vi.fn();
        const cb = new Combobox([
            { label: 'Apple', value: 'a' },
            { label: 'Banana', value: 'b' }
        ], { onSelect });

        cb.handleKey(makeKey('a')); // query is "a"
        cb.handleKey(makeKey('down')); // highlights 'Apple' (index 0)
        cb.handleKey(makeKey('down')); // highlights 'Banana' (index 1)
        cb.handleKey(makeKey('enter')); // selects 'Banana'

        expect(cb.value).toBe('b');
        expect(onSelect).toHaveBeenCalledWith('b');
    });

    it('free text with no match is kept as the value', () => {
        const onSelect = vi.fn();
        const cb = new Combobox([
            { label: 'Apple', value: 'a' },
            { label: 'Banana', value: 'b' }
        ], { onSelect });

        cb.handleKey(makeKey('z'));
        cb.handleKey(makeKey('y'));
        cb.handleKey(makeKey('enter'));

        expect(cb.value).toBe('zy');
        expect(onSelect).toHaveBeenCalledWith('zy');
    });

    it('ASCII fallback markers render when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const screen = new Screen(30, 6);
        const cb = new Combobox([
            { label: 'Apple', value: 'a' },
            { label: 'Banana', value: 'b' }
        ]);

        cb.updateRect({ x: 0, y: 0, width: 30, height: 6 });
        cb.isFocused = true;
        cb.handleKey(makeKey('down')); // opens dropdown, highlights index 0 (Apple)

        cb.render(screen);

        const rows = [];
        for (let r = 0; r < 6; r++) {
            rows.push(screen.back[r].map(c => c.char).join(''));
        }

        // Closed/open prefix fallback is 'v ' when open, and highlighted marker fallback is '* '
        expect(rows[0]).toContain('v '); // open prefix fallback
        expect(rows[1]).toContain('* Apple'); // highlighted option fallback marker
        expect(rows[2]).toContain('  Banana');
    });

    it('Unicode markers render when caps.unicode is true', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const screen = new Screen(30, 6);
        const cb = new Combobox([
            { label: 'Apple', value: 'a' },
            { label: 'Banana', value: 'b' }
        ]);

        cb.updateRect({ x: 0, y: 0, width: 30, height: 6 });
        cb.isFocused = true;
        cb.handleKey(makeKey('down')); // opens dropdown, highlights index 0 (Apple)

        cb.render(screen);

        const rows = [];
        for (let r = 0; r < 6; r++) {
            rows.push(screen.back[r].map(c => c.char).join(''));
        }

        // Closed/open prefix is '▼ ' when open, and highlighted marker is '● '
        expect(rows[0]).toContain('▼ '); // open prefix
        expect(rows[1]).toContain('● Apple'); // highlighted option marker
        expect(rows[2]).toContain('  Banana');
    });

    it('up key navigates options backwards and wraps around', () => {
        const cb = new Combobox([
            { label: 'Apple', value: 'a' },
            { label: 'Banana', value: 'b' }
        ]);

        cb.handleKey(makeKey('down')); // highlights index 0 ('Apple')
        cb.handleKey(makeKey('up'));   // highlights index 1 ('Banana') due to wrapping
        cb.handleKey(makeKey('up'));   // highlights index 0 ('Apple')
    });

    it('escape key closes dropdown', () => {
        const screen = new Screen(30, 6);
        const cb = new Combobox([
            { label: 'Apple', value: 'a' },
            { label: 'Banana', value: 'b' }
        ]);

        cb.updateRect({ x: 0, y: 0, width: 30, height: 6 });
        cb.isFocused = true;
        cb.handleKey(makeKey('down')); // opens dropdown
        cb.handleKey(makeKey('escape')); // closes dropdown

        cb.render(screen);

        const rows = [];
        for (let r = 0; r < 6; r++) {
            rows.push(screen.back[r].map(c => c.char).join(''));
        }

        expect(rows[0]).toContain('▶ '); // closed prefix
        expect(rows[1]).not.toContain('Apple'); // dropdown options are not rendered
    });

    it('backspace deletes characters from input', () => {
        const cb = new Combobox([
            { label: 'Apple', value: 'a' }
        ]);

        cb.handleKey(makeKey('a'));
        cb.handleKey(makeKey('p'));
        expect(cb.filtered.length).toBe(1);

        cb.handleKey(makeKey('backspace'));
        expect(cb.filtered.length).toBe(1);
    });
});

describe('Performance optimizations', () => {
    it('does not mark dirty when escape is pressed while already closed', () => {
        const cb = new Combobox([
            { label: 'Apple', value: 'a' }
        ]);

        cb.clearDirty();

        cb.handleKey(makeKey('escape'));

        expect(cb.isDirty).toBe(false);
    });

    it('does not mark dirty when backspace is pressed on empty input', () => {
        const cb = new Combobox([
            { label: 'Apple', value: 'a' }
        ]);

        cb.clearDirty();

        cb.handleKey(makeKey('backspace'));

        expect(cb.isDirty).toBe(false);
    });

    it('marks dirty when backspace removes a character', () => {
        const cb = new Combobox([
            { label: 'Apple', value: 'a' }
        ]);

        cb.handleKey(makeKey('a'));

        cb.clearDirty();

        cb.handleKey(makeKey('backspace'));

        expect(cb.isDirty).toBe(true);
    });
});
