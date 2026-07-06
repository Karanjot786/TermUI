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

    it('_changeFocus emits blur and focus events with epoch field', () => {
        const fm = new FocusManager();
        const focusHandler = vi.fn();
        const blurHandler = vi.fn();
        fm.on('focus', focusHandler);
        fm.on('blur', blurHandler);

        fm.register(makeWidget('w1'));
        fm.register(makeWidget('w2'));

        // focusWidget triggers _changeFocus
        fm.focusWidget('w2');

        const blurCall = blurHandler.mock.calls.find(([e]) => e.targetId === 'w1');
        const focusCall = focusHandler.mock.calls.find(([e]) => e.targetId === 'w2');

        expect(blurCall).toBeDefined();
        expect(typeof blurCall![0].epoch).toBe('number');
        expect(blurCall![0].epoch).toBeGreaterThanOrEqual(0);

        expect(focusCall).toBeDefined();
        expect(typeof focusCall![0].epoch).toBe('number');
        expect(focusCall![0].epoch).toBeGreaterThan(blurCall![0].epoch);
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

    describe('unregister', () => {
        it('does not emit blur when unregistering a non-focused widget', () => {
            const fm = new FocusManager();
            const blurHandler = vi.fn();
            fm.on('blur', blurHandler);

            fm.register(makeWidget('a'));
            fm.register(makeWidget('b'));
            fm.register(makeWidget('c'));
            // 'a' is focused

            fm.unregister('b'); // 'b' is NOT focused

            expect(blurHandler).not.toHaveBeenCalled();
            expect(fm.currentId).toBe('a');
        });

        it('emits blur when unregistering the focused widget', () => {
            const fm = new FocusManager();
            const blurHandler = vi.fn();
            fm.on('blur', blurHandler);

            fm.register(makeWidget('a'));
            fm.register(makeWidget('b'));
            // 'a' is focused

            fm.unregister('a');

            expect(blurHandler).toHaveBeenCalledWith(
                expect.objectContaining({ targetId: 'a', type: 'blur' })
            );
        });

        it('moves focus to next widget when focused widget is unregistered', () => {
            const fm = new FocusManager();
            fm.register(makeWidget('a'));
            fm.register(makeWidget('b'));
            fm.register(makeWidget('c'));
            // 'a' is focused

            fm.unregister('a');

            expect(fm.currentId).toBe('b');
        });

        it('sets currentId to null when last widget is unregistered', () => {
            const fm = new FocusManager();
            fm.register(makeWidget('a'));

            fm.unregister('a');

            expect(fm.currentId).toBeNull();
        });

        it('adjusts index correctly when non-focused widget before focused is removed', () => {
            const fm = new FocusManager();
            fm.register(makeWidget('a'));
            fm.register(makeWidget('b'));
            fm.register(makeWidget('c'));
            fm.focusWidget('c');
            // focused index = 2

            fm.unregister('a');
            // 'c' should still be focused, index adjusted from 2 to 1

            expect(fm.currentId).toBe('c');
        });

        it('unregistering a non-focused widget after focused one does not affect focus', () => {
            const fm = new FocusManager();
            fm.register(makeWidget('a'));
            fm.register(makeWidget('b'));
            fm.register(makeWidget('c'));
            // 'a' is focused

            fm.unregister('c');

            expect(fm.currentId).toBe('a');
        });

        it('does not emit any events when unregistering a non-focused widget', () => {
            const fm = new FocusManager();
            const focusHandler = vi.fn();
            const blurHandler = vi.fn();
            fm.on('focus', focusHandler);
            fm.on('blur', blurHandler);

            fm.register(makeWidget('a'));
            fm.register(makeWidget('b'));
            focusHandler.mockClear();
            blurHandler.mockClear();

            fm.unregister('b');

            expect(focusHandler).not.toHaveBeenCalled();
            expect(blurHandler).not.toHaveBeenCalled();
        });
    });
});

describe('FocusManager Spatial Navigation', () => {
    it('right move picks the nearest right neighbor', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a', 0, true));
        fm.register(makeWidget('b', 1, true));
        
        fm.setRect('a', { x: 0, y: 0, width: 4, height: 1 });
        fm.setRect('b', { x: 10, y: 0, width: 4, height: 1 });
        
        fm.focusWidget('a');
        expect(fm.focusRight()).toBe(true);
        expect(fm.currentId).toBe('b');
    });

    it('down move picks the nearest below neighbor', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('top', 0, true));
        fm.register(makeWidget('bottom', 1, true));
        
        fm.setRect('top', { x: 0, y: 0, width: 10, height: 2 });
        fm.setRect('bottom', { x: 0, y: 5, width: 10, height: 2 });
        
        fm.focusWidget('top');
        expect(fm.focusDown()).toBe(true);
        expect(fm.currentId).toBe('bottom');
    });

    it('up move picks the nearest above neighbor', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('bottom', 0, true));
        fm.register(makeWidget('top', 1, true));
        
        fm.setRect('bottom', { x: 0, y: 5, width: 10, height: 2 });
        fm.setRect('top', { x: 0, y: 0, width: 10, height: 2 });
        
        fm.focusWidget('bottom');
        expect(fm.focusUp()).toBe(true);
        expect(fm.currentId).toBe('top');
    });

    it('left move picks the nearest left neighbor', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('right', 0, true));
        fm.register(makeWidget('left', 1, true));
        
        fm.setRect('right', { x: 10, y: 0, width: 4, height: 1 });
        fm.setRect('left', { x: 0, y: 0, width: 4, height: 1 });
        
        fm.focusWidget('right');
        expect(fm.focusLeft()).toBe(true);
        expect(fm.currentId).toBe('left');
    });

    it('no candidate in a direction returns false', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('lonely', 0, true));
        fm.setRect('lonely', { x: 5, y: 5, width: 5, height: 5 });
        
        fm.focusWidget('lonely');
        
        expect(fm.focusUp()).toBe(false);
        expect(fm.focusDown()).toBe(false);
        expect(fm.focusLeft()).toBe(false);
        expect(fm.focusRight()).toBe(false);
        expect(fm.currentId).toBe('lonely');
    });

    it('a closer widget wins over a farther one on the same axis', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('start', 0, true));
        fm.register(makeWidget('close', 1, true));
        fm.register(makeWidget('far', 2, true));
        
        fm.setRect('start', { x: 0, y: 0, width: 2, height: 2 });
        fm.setRect('close', { x: 5, y: 0, width: 2, height: 2 }); // dx=5
        fm.setRect('far', { x: 15, y: 0, width: 2, height: 2 });  // dx=15
        
        fm.focusWidget('start');
        
        expect(fm.focusRight()).toBe(true);
        // It should pick the closer one
        expect(fm.currentId).toBe('close');
    });
});

describe('FocusManager Re-entrancy', () => {
    it('unregister in blur handler does not corrupt _currentIndex', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a', 0, true));
        fm.register(makeWidget('b', 1, true));
        fm.register(makeWidget('c', 2, true));

        fm.focusWidget('a');
        expect(fm.currentId).toBe('a');

        // On blur of 'a', unregister 'a'
        fm.on('blur', (event) => {
            if (event.targetId === 'a') {
                fm.unregister('a');
            }
        });

        fm.focusWidget('b');

        // After the blur handler unregistered 'a', focus should go to 'b'
        expect(fm.currentId).toBe('b');
        expect(fm.isFocused('b')).toBe(true);
    });

    it('unregister in focus handler does not cause out-of-bounds access', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a', 0, true));
        fm.register(makeWidget('b', 1, true));
        fm.register(makeWidget('c', 2, true));

        fm.focusWidget('a');

        // On focus of 'c', unregister 'c'
        fm.on('focus', (event) => {
            if (event.targetId === 'c') {
                fm.unregister('c');
            }
        });

        fm.focusWidget('c');

        // Focus should have moved to 'c' before it was unregistered
        // After unregister, the next available widget gets focus
        expect(fm.currentId).toBe('b');
    });

    it('re-entrant focusNext from focus handler does not corrupt state', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a', 0, true));
        fm.register(makeWidget('b', 1, true));
        fm.register(makeWidget('c', 2, true));

        fm.focusWidget('a');

        // On focus of 'b', immediately move to next
        fm.on('focus', (event) => {
            if (event.targetId === 'b') {
                fm.focusNext();
            }
        });

        fm.focusWidget('b');

        // After re-entrant focusNext, should end up on 'c'
        expect(fm.currentId).toBe('c');
    });

    it('registering a new focusable that sorts before current does not change current focus', () => {
        const fm = new FocusManager();
        // A (10), B (20)
        fm.register(makeWidget('a', 10, true));
        fm.register(makeWidget('b', 20, true));

        // Focus B
        fm.focusWidget('b');
        expect(fm.currentId).toBe('b');

        // Register C with lower tabIndex that sorts before existing items
        fm.register(makeWidget('c', 5, true));

        // Observable behavior: focused id must remain 'b'
        expect(fm.currentId).toBe('b');
    });
});

describe('FocusManager Focus Trap', () => {
    it('release() on empty stack warns and does not throw', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a'));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        expect(() => fm.release('some-modal')).not.toThrow();
        expect(warnSpy).toHaveBeenCalledOnce();
        expect(warnSpy.mock.calls[0][0]).toContain('empty trap stack');

        warnSpy.mockRestore();
    });

    it('release() with mismatched containerId warns and keeps trap active', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a'));
        fm.register(makeWidget('b'));
        fm.registerContainerMembers('modal-1', ['b']);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        fm.trap('modal-1');
        fm.release('modal-2'); // wrong ID

        expect(warnSpy).toHaveBeenCalledOnce();
        expect(warnSpy.mock.calls[0][0]).toContain('modal-2');
        expect(fm.isTrapped).toBe(true);
        expect(fm.currentTrapId).toBe('modal-1');

        warnSpy.mockRestore();
    });

    it('release() with correct containerId removes the trap', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a'));
        fm.register(makeWidget('b'));
        fm.registerContainerMembers('modal-1', ['b']);

        fm.trap('modal-1');
        expect(fm.isTrapped).toBe(true);

        fm.release('modal-1');
        expect(fm.isTrapped).toBe(false);
        expect(fm.currentTrapId).toBeNull();
    });

    it('release() restores focus to widget focused before trap() was called', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('trigger-btn'));
        fm.register(makeWidget('modal-input'));
        fm.register(makeWidget('modal-confirm'));
        fm.registerContainerMembers('dialog', ['modal-input', 'modal-confirm']);

        fm.focusWidget('trigger-btn');
        expect(fm.currentId).toBe('trigger-btn');

        fm.trap('dialog');
        expect(fm.currentId).toBe('modal-input');

        fm.focusNext(); // move around inside modal
        expect(fm.currentId).toBe('modal-confirm');

        fm.release('dialog');
        // Must go back to what had focus before trap, not stay inside modal
        expect(fm.currentId).toBe('trigger-btn');
    });

    it('nested traps: each release restores to the correct prior focus', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('main-btn'));
        fm.register(makeWidget('outer-input'));
        fm.register(makeWidget('inner-input'));
        fm.registerContainerMembers('outer-modal', ['outer-input']);
        fm.registerContainerMembers('inner-modal', ['inner-input']);

        fm.focusWidget('main-btn');

        fm.trap('outer-modal');
        expect(fm.currentId).toBe('outer-input');

        fm.trap('inner-modal');
        expect(fm.currentId).toBe('inner-input');

        fm.release('inner-modal');
        expect(fm.currentId).toBe('outer-input'); // restored to pre-inner-trap focus
        expect(fm.currentTrapId).toBe('outer-modal');

        fm.release('outer-modal');
        expect(fm.currentId).toBe('main-btn'); // restored to pre-outer-trap focus
        expect(fm.isTrapped).toBe(false);
    });

    it('double release() warns on second call and leaves state clean', () => {
        const fm = new FocusManager();
        fm.register(makeWidget('a'));
        fm.register(makeWidget('b'));
        fm.registerContainerMembers('modal', ['b']);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        fm.trap('modal');
        fm.release('modal'); // correct
        fm.release('modal'); // duplicate — stack now empty

        expect(warnSpy).toHaveBeenCalledOnce();
        expect(warnSpy.mock.calls[0][0]).toContain('empty trap stack');
        expect(fm.isTrapped).toBe(false);

        warnSpy.mockRestore();
    });
});