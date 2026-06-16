// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for CommandPalette widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { CommandPalette, type Command } from './CommandPalette.js';

// ── Helpers ───────────────────────────────────────────

const COLS = 80;
const ROWS = 24;

function makeKey(
    key: string,
    opts: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {},
): {
    key: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    _propagationStopped: boolean;
    stopPropagation(): void;
    preventDefault(): void;
} {
    const event = {
        key,
        ctrl: opts.ctrl ?? false,
        alt: opts.alt ?? false,
        shift: opts.shift ?? false,
        _propagationStopped: false,
        stopPropagation() { this._propagationStopped = true; },
        preventDefault() { /* no-op */ },
    };
    return event;
}

function makeCommands(): Command[] {
    return [
        { id: 'open', label: 'Open File', action: vi.fn() },
        { id: 'close', label: 'Close File', action: vi.fn() },
        { id: 'settings', label: 'Settings', action: vi.fn() },
    ];
}

function renderPalette(palette: CommandPalette): Screen {
    const screen = new Screen(COLS, ROWS);
    palette.updateRect({ x: 0, y: 0, width: COLS, height: ROWS });
    palette.render(screen);
    return screen;
}

function allText(screen: Screen): string {
    return screen.back.map(row => row.map(c => c.char).join('')).join('\n');
}

function rowText(screen: Screen, row: number): string {
    return screen.back[row]!.map(c => c.char).join('');
}

// ── Tests ─────────────────────────────────────────────

describe('CommandPalette', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── 1. Initial State ──────────────────────────────

    describe('initial state', () => {
        it('starts hidden', () => {
            const palette = new CommandPalette(makeCommands());
            expect(palette.visible).toBe(false);
        });

        it('query is empty on construction', () => {
            const palette = new CommandPalette(makeCommands());
            expect((palette as any)._query).toBe('');
        });

        it('cursor position is 0 on construction', () => {
            const palette = new CommandPalette(makeCommands());
            expect((palette as any)._cursorPos).toBe(0);
        });

        it('selected index is 0 on construction', () => {
            const palette = new CommandPalette(makeCommands());
            expect((palette as any)._selectedIndex).toBe(0);
        });

        it('all commands are initially available', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette(cmds);
            expect((palette as any)._filtered).toHaveLength(cmds.length);
        });
    });

    // ── 2. show() ─────────────────────────────────────

    describe('show()', () => {
        it('makes palette visible', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            expect(palette.visible).toBe(true);
        });

        it('resets query to empty', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.insertChar('x');
            palette.hide();
            palette.show();
            expect((palette as any)._query).toBe('');
        });

        it('resets cursor position to 0', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.insertChar('a');
            palette.hide();
            palette.show();
            expect((palette as any)._cursorPos).toBe(0);
        });

        it('resets selected index to 0', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.selectNext();
            palette.hide();
            palette.show();
            expect((palette as any)._selectedIndex).toBe(0);
        });

        it('restores all commands as filtered', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette(cmds);
            palette.show();
            palette.insertChar('z'); // no matches
            palette.hide();
            palette.show();
            expect((palette as any)._filtered).toHaveLength(cmds.length);
        });

        it('calls markDirty', () => {
            const palette = new CommandPalette(makeCommands());
            const spy = vi.spyOn(palette as any, 'markDirty');
            palette.show();
            expect(spy).toHaveBeenCalled();
        });
    });

    // ── 3. hide() ────────────────────────────────────

    describe('hide()', () => {
        it('makes palette hidden', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.hide();
            expect(palette.visible).toBe(false);
        });

        it('calls markDirty', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const spy = vi.spyOn(palette as any, 'markDirty');
            palette.hide();
            expect(spy).toHaveBeenCalled();
        });

        it('rendering after hide produces no output', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.hide();
            const screen = renderPalette(palette);
            const text = allText(screen);
            // All cells should be blank — no border or content rendered
            expect(text.replace(/\s/g, '')).toBe('');
        });
    });

    // ── 4. toggle() ───────────────────────────────────

    describe('toggle()', () => {
        it('opens a hidden palette', () => {
            const palette = new CommandPalette(makeCommands());
            palette.toggle();
            expect(palette.visible).toBe(true);
        });

        it('closes an open palette', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.toggle();
            expect(palette.visible).toBe(false);
        });

        it('alternates visibility correctly across multiple toggles', () => {
            const palette = new CommandPalette(makeCommands());
            for (let i = 0; i < 4; i++) {
                palette.toggle();
                expect(palette.visible).toBe(i % 2 === 0);
            }
        });
    });

    // ── 5. Ctrl+P Toggle ─────────────────────────────

    describe('Ctrl+P toggle', () => {
        it('opens palette when hidden', () => {
            const palette = new CommandPalette(makeCommands());
            const ev = makeKey('p', { ctrl: true });
            palette.handleKey(ev as any);
            expect(palette.visible).toBe(true);
        });

        it('closes palette when visible', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const ev = makeKey('p', { ctrl: true });
            palette.handleKey(ev as any);
            expect(palette.visible).toBe(false);
        });

        it('calls stopPropagation on Ctrl+P', () => {
            const palette = new CommandPalette(makeCommands());
            const ev = makeKey('p', { ctrl: true });
            palette.handleKey(ev as any);
            expect(ev._propagationStopped).toBe(true);
        });
    });

    // ── 6. Hidden Palette Ignores Input ──────────────

    describe('hidden palette ignores all input', () => {
        const ignoredKeys = ['up', 'down', 'enter', 'a', 'backspace'];

        for (const key of ignoredKeys) {
            it(`ignores key "${key}" when hidden`, () => {
                const cmds = makeCommands();
                const palette = new CommandPalette(cmds);
                // palette is hidden by default
                palette.handleKey(makeKey(key) as any);

                expect((palette as any)._query).toBe('');
                expect((palette as any)._selectedIndex).toBe(0);
                // actions must not have been called
                for (const cmd of cmds) {
                    expect(cmd.action).not.toHaveBeenCalled();
                }
            });
        }
    });

    // ── 7. Character Insertion ────────────────────────

    describe('character insertion', () => {
        it('appends characters to the query', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.handleKey(makeKey('a') as any);
            palette.handleKey(makeKey('b') as any);
            palette.handleKey(makeKey('c') as any);
            expect((palette as any)._query).toBe('abc');
        });

        it('advances cursor position after each character', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.handleKey(makeKey('x') as any);
            expect((palette as any)._cursorPos).toBe(1);
            palette.handleKey(makeKey('y') as any);
            expect((palette as any)._cursorPos).toBe(2);
        });

        it('updates filtered commands after typing', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            // 'of' is a fuzzy match for 'Open File' and 'Close File'
            palette.handleKey(makeKey('o') as any);
            palette.handleKey(makeKey('f') as any);
            const filtered: Command[] = (palette as any)._filtered;
            expect(filtered.some(c => c.id === 'open')).toBe(true);
        });

        it('ignores Ctrl-modified printable keys', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const ev = makeKey('a', { ctrl: true });
            palette.handleKey(ev as any);
            expect((palette as any)._query).toBe('');
        });

        it('ignores Alt-modified printable keys', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const ev = makeKey('a', { alt: true });
            palette.handleKey(ev as any);
            expect((palette as any)._query).toBe('');
        });
    });

    // ── 8. Backspace Behavior ─────────────────────────

    describe('backspace', () => {
        it('removes the last typed character', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.insertChar('a');
            palette.insertChar('b');
            palette.insertChar('c');
            palette.handleKey(makeKey('backspace') as any);
            expect((palette as any)._query).toBe('ab');
        });

        it('updates the filter after deletion', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.insertChar('z'); // no matches
            palette.handleKey(makeKey('backspace') as any);
            // empty query → all commands visible again
            expect((palette as any)._filtered).toHaveLength(3);
        });

        it('decrements cursor position after backspace', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.insertChar('a');
            expect((palette as any)._cursorPos).toBe(1);
            palette.handleKey(makeKey('backspace') as any);
            expect((palette as any)._cursorPos).toBe(0);
        });
    });

    // ── 9. Backspace on Empty Query ───────────────────

    describe('backspace on empty query', () => {
        it('does not throw', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            expect(() => palette.handleKey(makeKey('backspace') as any)).not.toThrow();
        });

        it('query remains empty', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.handleKey(makeKey('backspace') as any);
            expect((palette as any)._query).toBe('');
        });

        it('cursor position stays at 0', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.handleKey(makeKey('backspace') as any);
            expect((palette as any)._cursorPos).toBe(0);
        });
    });

    // ── 10. Filtering Logic ───────────────────────────

    describe('filtering logic', () => {
        it('fuzzy-matches "of" to "Open File"', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.insertChar('o');
            palette.insertChar('f');
            const filtered: Command[] = (palette as any)._filtered;
            expect(filtered.some(c => c.id === 'open')).toBe(true);
        });

        it('fuzzy-matches "cf" to "Close File"', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.insertChar('c');
            palette.insertChar('f');
            const filtered: Command[] = (palette as any)._filtered;
            expect(filtered.some(c => c.id === 'close')).toBe(true);
        });

        it('filters out non-matching commands', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            // 'set' uniquely matches 'Settings', not the file commands
            palette.insertChar('s');
            palette.insertChar('e');
            palette.insertChar('t');
            const filtered: Command[] = (palette as any)._filtered;
            expect(filtered.some(c => c.id === 'settings')).toBe(true);
            // 'Open File' and 'Close File' should not match 'set'
            expect(filtered.some(c => c.id === 'open')).toBe(false);
        });

        it('empty query returns all commands', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette(cmds);
            palette.show();
            expect((palette as any)._filtered).toHaveLength(cmds.length);
        });

        it('filter is case-insensitive', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.insertChar('O');
            palette.insertChar('F');
            const filtered: Command[] = (palette as any)._filtered;
            expect(filtered.some(c => c.id === 'open')).toBe(true);
        });
    });

    // ── 11. Empty Search Results ──────────────────────

    describe('empty search results', () => {
        it('filtered list becomes empty when no commands match', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            for (const ch of 'zzzzzzz') palette.insertChar(ch);
            expect((palette as any)._filtered).toHaveLength(0);
        });

        it('does not throw when rendering with zero results', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            for (const ch of 'zzzzzzz') palette.insertChar(ch);
            expect(() => renderPalette(palette)).not.toThrow();
        });
    });

    // ── 12. Selection Reset After Filtering ──────────

    describe('selection reset after filtering', () => {
        it('resets selectedIndex to 0 when query changes', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.selectNext(); // move to index 1
            expect((palette as any)._selectedIndex).toBe(1);
            palette.insertChar('s'); // filter → resets to 0
            expect((palette as any)._selectedIndex).toBe(0);
        });

        it('no out-of-range selection after narrowing results', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.selectNext();
            palette.selectNext(); // index 2
            palette.insertChar('s'); // only 'Settings' remains, resets to 0
            const idx: number = (palette as any)._selectedIndex;
            const len: number = (palette as any)._filtered.length;
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(idx).toBeLessThan(Math.max(len, 1));
        });
    });

    // ── 13. Arrow Navigation ──────────────────────────

    describe('arrow key navigation', () => {
        it('down arrow increments selectedIndex', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.handleKey(makeKey('down') as any);
            expect((palette as any)._selectedIndex).toBe(1);
        });

        it('up arrow decrements selectedIndex', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.handleKey(makeKey('down') as any);
            palette.handleKey(makeKey('up') as any);
            expect((palette as any)._selectedIndex).toBe(0);
        });

        it('down then up returns to original index', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.handleKey(makeKey('down') as any);
            palette.handleKey(makeKey('down') as any);
            palette.handleKey(makeKey('up') as any);
            palette.handleKey(makeKey('up') as any);
            expect((palette as any)._selectedIndex).toBe(0);
        });

        it('arrow keys call stopPropagation', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const downEv = makeKey('down');
            palette.handleKey(downEv as any);
            expect(downEv._propagationStopped).toBe(true);

            const upEv = makeKey('up');
            palette.handleKey(upEv as any);
            expect(upEv._propagationStopped).toBe(true);
        });
    });

    // ── 14. Selection Clamping ────────────────────────

    describe('selection clamping', () => {
        it('up at first item stays at 0', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            expect((palette as any)._selectedIndex).toBe(0);
            palette.handleKey(makeKey('up') as any);
            expect((palette as any)._selectedIndex).toBe(0);
        });

        it('down at last item stays at last index', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette(cmds);
            palette.show();
            // Move to last item
            for (let i = 0; i < cmds.length + 5; i++) {
                palette.handleKey(makeKey('down') as any);
            }
            expect((palette as any)._selectedIndex).toBe(cmds.length - 1);
        });

        it('selectedIndex never becomes negative', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            for (let i = 0; i < 10; i++) palette.handleKey(makeKey('up') as any);
            expect((palette as any)._selectedIndex).toBeGreaterThanOrEqual(0);
        });
    });

    // ── 15. Enter Executes Command ────────────────────

    describe('Enter executes command and closes palette', () => {
        it('executes the selected command action', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette(cmds);
            palette.show();
            palette.handleKey(makeKey('enter') as any);
            expect(cmds[0]!.action).toHaveBeenCalledTimes(1);
        });

        it('hides the palette after execution', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.handleKey(makeKey('enter') as any);
            expect(palette.visible).toBe(false);
        });

        it('executes the second command when selection is at index 1', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette(cmds);
            palette.show();
            palette.handleKey(makeKey('down') as any);
            palette.handleKey(makeKey('enter') as any);
            expect(cmds[1]!.action).toHaveBeenCalledTimes(1);
            expect(cmds[0]!.action).not.toHaveBeenCalled();
        });

        it('calls stopPropagation on enter', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const ev = makeKey('enter');
            palette.handleKey(ev as any);
            expect(ev._propagationStopped).toBe(true);
        });
    });

    // ── 16. Return Key Alias ──────────────────────────

    describe('"return" key acts like "enter"', () => {
        it('executes the selected command', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette(cmds);
            palette.show();
            palette.handleKey(makeKey('return') as any);
            expect(cmds[0]!.action).toHaveBeenCalledTimes(1);
        });

        it('hides the palette', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.handleKey(makeKey('return') as any);
            expect(palette.visible).toBe(false);
        });
    });

    // ── 17. Confirm With No Results ───────────────────

    describe('confirm with no results', () => {
        it('does not throw when filtered list is empty', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            for (const ch of 'zzzzzzz') palette.insertChar(ch);
            expect((palette as any)._filtered).toHaveLength(0);
            expect(() => palette.handleKey(makeKey('enter') as any)).not.toThrow();
        });

        it('does not execute any action when filtered list is empty', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette(cmds);
            palette.show();
            for (const ch of 'zzzzzzz') palette.insertChar(ch);
            palette.handleKey(makeKey('enter') as any);
            for (const cmd of cmds) {
                expect(cmd.action).not.toHaveBeenCalled();
            }
        });

        it('palette remains open when no match to confirm', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            for (const ch of 'zzzzzzz') palette.insertChar(ch);
            palette.handleKey(makeKey('enter') as any);
            // confirm() only hides when there IS a match
            expect(palette.visible).toBe(true);
        });
    });

    // ── 18. Escape Closes Palette ─────────────────────

    describe('Escape closes palette', () => {
        it('hides the palette', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.handleKey(makeKey('escape') as any);
            expect(palette.visible).toBe(false);
        });

        it('calls stopPropagation', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const ev = makeKey('escape');
            palette.handleKey(ev as any);
            expect(ev._propagationStopped).toBe(true);
        });
    });

    // ── 19. Ctrl+C Closes Palette ─────────────────────

    describe('Ctrl+C closes palette', () => {
        it('hides the palette', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.handleKey(makeKey('c', { ctrl: true }) as any);
            expect(palette.visible).toBe(false);
        });

        it('calls stopPropagation', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const ev = makeKey('c', { ctrl: true });
            palette.handleKey(ev as any);
            expect(ev._propagationStopped).toBe(true);
        });
    });

    // ── 20. Delete Key Works Like Backspace ───────────

    describe('"delete" key behaves like backspace', () => {
        it('removes last typed character', () => {
            const palette = new CommandPalette(makeCommands());
            palette.show();
            palette.insertChar('a');
            palette.insertChar('b');
            palette.handleKey(makeKey('delete') as any);
            expect((palette as any)._query).toBe('a');
        });

        it('updates filter after delete', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette(cmds);
            palette.show();
            palette.insertChar('z'); // no matches
            palette.handleKey(makeKey('delete') as any);
            expect((palette as any)._filtered).toHaveLength(cmds.length);
        });
    });

    // ── 21. Unsupported Keys Are Ignored ──────────────

    describe('unsupported keys leave state unchanged', () => {
        const unsupported = ['left', 'right', 'tab', 'home', 'end', 'pageup', 'pagedown'];

        for (const key of unsupported) {
            it(`key "${key}" does not mutate state`, () => {
                const palette = new CommandPalette(makeCommands());
                palette.show();
                const queryBefore: string = (palette as any)._query;
                const idxBefore: number = (palette as any)._selectedIndex;
                expect(() => palette.handleKey(makeKey(key) as any)).not.toThrow();
                expect((palette as any)._query).toBe(queryBefore);
                expect((palette as any)._selectedIndex).toBe(idxBefore);
            });
        }
    });

    // ── 22. Rendering When Hidden ─────────────────────

    describe('rendering when hidden', () => {
        it('does not draw content onto the screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands());
            // Not shown — palette stays hidden
            const screen = renderPalette(palette);
            const text = allText(screen).replace(/\s/g, '');
            expect(text).toBe('');
        });
    });

    // ── 23. Placeholder Rendering ─────────────────────

    describe('placeholder rendering', () => {
        it('shows placeholder text when query is empty', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands(), { placeholder: 'Type a command...' });
            palette.show();
            const screen = renderPalette(palette);
            expect(allText(screen)).toContain('Type a command...');
        });

        it('custom placeholder is rendered', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands(), { placeholder: 'Find action' });
            palette.show();
            const screen = renderPalette(palette);
            expect(allText(screen)).toContain('Find action');
        });
    });

    // ── 24. Query Rendering ───────────────────────────

    describe('query rendering', () => {
        it('shows the typed query text', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands(), { placeholder: 'Type here' });
            palette.show();
            palette.insertChar('s');
            palette.insertChar('e');
            palette.insertChar('t');
            const screen = renderPalette(palette);
            const text = allText(screen);
            expect(text).toContain('set');
        });

        it('placeholder does not appear once query is entered', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const placeholder = 'Type a command...';
            const palette = new CommandPalette(makeCommands(), { placeholder });
            palette.show();
            palette.insertChar('o');
            const screen = renderPalette(palette);
            const text = allText(screen);
            // The placeholder should be replaced by the query 'o'
            expect(text).not.toContain(placeholder);
        });
    });

    // ── 25. Unicode Rendering ─────────────────────────

    describe('unicode rendering', () => {
        it('renders 🔍 search icon', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const screen = renderPalette(palette);
            const text = allText(screen);
            expect(text).toContain('🔍');
        });

        it('renders ❯ selection indicator for the active item', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const screen = renderPalette(palette);
            const text = allText(screen);
            expect(text).toContain('❯');
        });

        it('renders ░ backdrop characters', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const screen = renderPalette(palette);
            const text = allText(screen);
            expect(text).toContain('░');
        });

        it('renders unicode border characters', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const screen = renderPalette(palette);
            const text = allText(screen);
            // Single-line border uses these Unicode box-drawing characters
            expect(text).toContain('┌');
            expect(text).toContain('┐');
            expect(text).toContain('└');
            expect(text).toContain('┘');
        });
    });

    // ── 26. ASCII Rendering ───────────────────────────

    describe('ASCII rendering (unicode=false)', () => {
        it('renders [?] instead of 🔍', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const screen = renderPalette(palette);
            const text = allText(screen);
            expect(text).toContain('[?]');
            expect(text).not.toContain('🔍');
        });

        it('renders > instead of ❯ for selection indicator', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const screen = renderPalette(palette);
            const text = allText(screen);
            expect(text).toContain('>');
            expect(text).not.toContain('❯');
        });

        it('does not render ░ backdrop in ASCII mode', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const screen = renderPalette(palette);
            const text = allText(screen);
            expect(text).not.toContain('░');
        });

        it('rendering remains stable without throwing', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            expect(() => renderPalette(palette)).not.toThrow();
        });
    });

    // ── 27. Shortcut Rendering ────────────────────────

    describe('command shortcut rendering', () => {
        it('renders shortcut text when provided', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            // Need 2+ commands so the rendering loop reaches index 0
            // (the items loop condition is `i + 3 < bh - 1`; with 1 item bh=4, 3 < 3 is false)
            const cmds: Command[] = [
                { id: 'save', label: 'Save File', shortcut: 'Ctrl+S', action: vi.fn() },
                { id: 'quit', label: 'Quit', action: vi.fn() },
            ];
            const palette = new CommandPalette(cmds);
            palette.show();
            const screen = renderPalette(palette);
            const text = allText(screen);
            expect(text).toContain('Ctrl+S');
        });

        it('rendering remains stable with a shortcut', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const cmds: Command[] = [
                { id: 'save', label: 'Save', shortcut: 'Ctrl+S', action: vi.fn() },
                { id: 'quit', label: 'Quit', action: vi.fn() },
            ];
            const palette = new CommandPalette(cmds);
            palette.show();
            expect(() => renderPalette(palette)).not.toThrow();
        });
    });

    // ── 28. maxVisible Limiting ───────────────────────

    describe('maxVisible limiting', () => {
        it('excludes commands beyond maxVisible from the rendered output', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            // 6 commands with maxVisible=3: vis slice is [0,1,2].
            // Rendering loop: items with index 3,4,5 are not in the vis slice at all.
            const cmds: Command[] = Array.from({ length: 6 }, (_, i) => ({
                id: `cmd${i}`,
                label: `Command ${i}`,
                action: vi.fn(),
            }));
            const palette = new CommandPalette(cmds, { maxVisible: 3 });
            palette.show();
            const screen = renderPalette(palette);
            const text = allText(screen);
            // Commands 3, 4, 5 are outside the vis slice — they must not appear
            expect(text).not.toContain('Command 3');
            expect(text).not.toContain('Command 4');
            expect(text).not.toContain('Command 5');
        });

        it('internal filtered list still contains all matching commands', () => {
            const cmds: Command[] = Array.from({ length: 6 }, (_, i) => ({
                id: `cmd${i}`,
                label: `Command ${i}`,
                action: vi.fn(),
            }));
            const palette = new CommandPalette(cmds, { maxVisible: 3 });
            palette.show();
            expect((palette as any)._filtered).toHaveLength(6);
        });
    });

    // ── 29. Small Width Rendering ─────────────────────

    describe('small width rendering', () => {
        it('does not throw on a narrow screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const screen = new Screen(10, 24);
            palette.updateRect({ x: 0, y: 0, width: 10, height: 24 });
            expect(() => palette.render(screen)).not.toThrow();
        });

        it('does not write out-of-bounds on narrow screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const w = 8;
            const screen = new Screen(w, 20);
            palette.updateRect({ x: 0, y: 0, width: w, height: 20 });
            expect(() => palette.render(screen)).not.toThrow();
            // No row should have more characters than the width
            for (const row of screen.back) {
                expect(row.length).toBeLessThanOrEqual(w);
            }
        });
    });

    // ── 30. Small Height Rendering ────────────────────

    describe('small height rendering', () => {
        it('does not throw on a very short screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const screen = new Screen(80, 4);
            palette.updateRect({ x: 0, y: 0, width: 80, height: 4 });
            expect(() => palette.render(screen)).not.toThrow();
        });

        it('renders stably on a 1-row screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette(makeCommands());
            palette.show();
            const screen = new Screen(80, 1);
            palette.updateRect({ x: 0, y: 0, width: 80, height: 1 });
            expect(() => palette.render(screen)).not.toThrow();
        });
    });

    // ── 31. Empty Command List ────────────────────────

    describe('empty command list', () => {
        it('show() and hide() do not throw', () => {
            const palette = new CommandPalette([]);
            expect(() => { palette.show(); palette.hide(); }).not.toThrow();
        });

        it('filtering with an empty list does not throw', () => {
            const palette = new CommandPalette([]);
            palette.show();
            expect(() => palette.insertChar('a')).not.toThrow();
        });

        it('rendering with an empty command list does not throw', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette([]);
            palette.show();
            expect(() => renderPalette(palette)).not.toThrow();
        });

        it('enter on empty command list does not throw', () => {
            const palette = new CommandPalette([]);
            palette.show();
            expect(() => palette.handleKey(makeKey('enter') as any)).not.toThrow();
        });

        it('arrow navigation on empty list does not throw', () => {
            const palette = new CommandPalette([]);
            palette.show();
            expect(() => palette.handleKey(makeKey('up') as any)).not.toThrow();
            expect(() => palette.handleKey(makeKey('down') as any)).not.toThrow();
        });

        it('selectedIndex stays at 0 with empty list', () => {
            const palette = new CommandPalette([]);
            palette.show();
            palette.handleKey(makeKey('down') as any);
            palette.handleKey(makeKey('down') as any);
            expect((palette as any)._selectedIndex).toBe(0);
        });
    });

    // ── 32. Multiple Command Executions ───────────────

    describe('multiple command executions across reopen cycles', () => {
        it('executes the correct action for each reopen cycle', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette(cmds);

            // Cycle 1: execute first command
            palette.show();
            palette.handleKey(makeKey('enter') as any);
            expect(cmds[0]!.action).toHaveBeenCalledTimes(1);

            // Cycle 2: move down, execute second command
            palette.show();
            palette.handleKey(makeKey('down') as any);
            palette.handleKey(makeKey('enter') as any);
            expect(cmds[1]!.action).toHaveBeenCalledTimes(1);

            // First command should still only have been called once
            expect(cmds[0]!.action).toHaveBeenCalledTimes(1);
        });

        it('state resets correctly between reopen cycles', () => {
            const palette = new CommandPalette(makeCommands());

            palette.show();
            palette.insertChar('s');
            palette.selectNext();
            palette.handleKey(makeKey('enter') as any);

            // Reopen: query and index must be reset
            palette.show();
            expect((palette as any)._query).toBe('');
            expect((palette as any)._selectedIndex).toBe(0);
            expect((palette as any)._filtered).toHaveLength(3);
        });

        it('previous actions are not re-triggered on reopen', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette(cmds);

            palette.show();
            palette.handleKey(makeKey('enter') as any);
            const callCount = (cmds[0]!.action as ReturnType<typeof vi.fn>).mock.calls.length;

            // Reopen but do NOT press enter
            palette.show();
            // The action count must not have increased
            expect((cmds[0]!.action as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
        });
    });
});
