// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for FocusManager
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { FocusManager } from './FocusManager.js';

function makeWidget(id: string, tabIndex = 0, focusable = true) {
    return { id, tabIndex, focusable };
}

describe('FocusManager', () => {
    it('auto-focuses first registered focusable widget', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a'));
        expect(fm.currentId).toBe('a');
    });

    it('focusNext cycles forward', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a'));
        fm.register(makeWidget('b'));
        fm.register(makeWidget('c'));
        fm.focusNext();
        expect(fm.currentId).toBe('b');
        fm.focusNext();
        expect(fm.currentId).toBe('c');
    });

    it('focusPrev cycles backward', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a'));
        fm.register(makeWidget('b'));
        fm.register(makeWidget('c'));
        fm.focusNext(); // b
        fm.focusNext(); // c
        fm.focusPrev(); // b
        expect(fm.currentId).toBe('b');
    });

    it('focusWidget directly focuses by ID', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a'));
        fm.register(makeWidget('b'));
        fm.register(makeWidget('c'));
        fm.focusWidget('c');
        expect(fm.currentId).toBe('c');
    });

    it('skips non-focusable widgets in focusNext', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a'));
        fm.register(makeWidget('disabled', 0, false));
        fm.register(makeWidget('b'));
        fm.focusNext();
        expect(fm.currentId).toBe('b');
    });

    it('emits focus event on new widget', () => {
        const fm = new FocusManager();
        const focusHandler = vi.fn();
        fm.on('focus', focusHandler);
        fm.register(makeWidget('a'));
        fm.register(makeWidget('b'));
        fm.focusNext();
        expect(focusHandler).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'b', type: 'focus' }));
    });

    it('emits blur event on previous widget', () => {
        const fm = new FocusManager();
        const blurHandler = vi.fn();
        fm.on('blur', blurHandler);
        fm.register(makeWidget('a'));
        fm.register(makeWidget('b'));
        fm.focusNext();
        expect(blurHandler).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'a', type: 'blur' }));
    });

    it('isFocused returns correct value', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a'));
        fm.register(makeWidget('b'));
        expect(fm.isFocused('a')).toBe(true);
        expect(fm.isFocused('b')).toBe(false);
        fm.focusNext();
        expect(fm.isFocused('a')).toBe(false);
        expect(fm.isFocused('b')).toBe(true);
    });
});
