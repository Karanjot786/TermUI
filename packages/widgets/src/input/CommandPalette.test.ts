// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for CommandPalette widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { CommandPalette, type Command } from './CommandPalette.js';

const COLS = 80;
const ROWS = 24;

function makeCommands(): Command[] {
    return [
        { id: 'open-file',  label: 'Open File',  description: 'Ctrl+O', action: vi.fn() },
        { id: 'save-file',  label: 'Save File',  description: 'Ctrl+S', action: vi.fn() },
        { id: 'find',       label: 'Find',        description: 'Ctrl+F', action: vi.fn() },
        { id: 'open-term',  label: 'Open Terminal', description: 'Ctrl+T', action: vi.fn() },
    ];
}

function makePalette(overrides: Partial<ConstructorParameters<typeof CommandPalette>[0]> = {}) {
    const onClose = vi.fn();
    const commands = makeCommands();
    const palette = new CommandPalette({ commands, onClose, ...overrides });
    return { palette, onClose, commands };
}

function renderPalette(palette: CommandPalette, w = COLS, h = ROWS): Screen {
    const screen = new Screen(w, h);
    palette.updateRect({ x: 0, y: 0, width: w, height: h });
    palette.render(screen);
    return screen;
}

function allText(screen: Screen): string {
    return screen.back.map(row => row.map(c => c.char).join('')).join('\n');
}

describe('CommandPalette', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('construction', () => {
        it('is focusable', () => {
            const { palette } = makePalette();
            expect(palette.focusable).toBe(true);
        });

        it('starts with empty query', () => {
            const { palette } = makePalette();
            expect(palette.getQuery()).toBe('');
        });
    });

    describe('filtering', () => {
        it('empty query shows all commands', () => {
            const { palette } = makePalette();
            // All 4 commands should be visible — inspect via handleKey typing nothing
            expect(palette.getQuery()).toBe('');
            // _filtered is private; test via ArrowDown reaching end
            // Move down 10 times — should clamp at last item (index 3 → maxVisible capped)
            for (let i = 0; i < 10; i++) palette.handleKey('down');
            // maxVisible defaults to 8, but only 4 items — so max index is 3
            // We verify by pressing Enter and checking the last command
            const action = (makeCommands()[3].action) as ReturnType<typeof vi.fn>;
            // Rebuild with fresh mocks so we can observe
            const cmds = makeCommands();
            const p2 = new CommandPalette({ commands: cmds });
            for (let i = 0; i < 10; i++) p2.handleKey('down');
            p2.handleKey('enter');
            expect(cmds[3].action).toHaveBeenCalledTimes(1);
        });

        it('typing filters commands by label (case-insensitive)', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            // Type 'open' → should match 'Open File' and 'Open Terminal'
            'open'.split('').forEach((ch) => palette.handleKey(ch));
            expect(palette.getQuery()).toBe('open');

            // Only matching commands reachable: ArrowDown once → index 1 (Open Terminal)
            palette.handleKey('down');
            palette.handleKey('enter');
            // 'Open File' is index 0, 'Open Terminal' is index 1 after filter
            expect(cmds[3].action).toHaveBeenCalledTimes(1); // Open Terminal
        });

        it('filtering by id also works', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            // 'save-file' id contains 'save'
            'save'.split('').forEach((ch) => palette.handleKey(ch));
            palette.handleKey('enter');
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });

        it('non-matching query shows no results (Enter does nothing)', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            'zzzzz'.split('').forEach((ch) => palette.handleKey(ch));
            palette.handleKey('enter');
            cmds.forEach((cmd) => expect(cmd.action).not.toHaveBeenCalled());
        });
    });

    describe('navigation', () => {
        it('ArrowDown moves selection down', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('down');
            // Selected index is now 1 — verify by Enter calling second command
            palette.handleKey('enter');
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });

        it('j key also moves selection down', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('j');
            palette.handleKey('enter');
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });

        it('ArrowUp moves selection up', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('down');
            palette.handleKey('down');
            palette.handleKey('up');
            // Selection should be at index 1
            palette.handleKey('enter');
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });

        it('k key also moves selection up', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('down');
            palette.handleKey('down');
            palette.handleKey('k');
            palette.handleKey('enter');
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });

        it('ArrowUp clamps at index 0', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('up');
            palette.handleKey('up');
            palette.handleKey('enter');
            // Should still be index 0
            expect(cmds[0].action).toHaveBeenCalledTimes(1);
        });

        it('ArrowDown clamps at last visible item', () => {
            const cmds = makeCommands(); // 4 commands
            const palette = new CommandPalette({ commands: cmds, maxVisible: 8 });

            for (let i = 0; i < 20; i++) palette.handleKey('down');
            palette.handleKey('enter');
            // Last item is index 3
            expect(cmds[3].action).toHaveBeenCalledTimes(1);
        });

        it('ArrowDown is capped by maxVisible', () => {
            const cmds = makeCommands(); // 4 commands
            const palette = new CommandPalette({ commands: cmds, maxVisible: 2 });

            for (let i = 0; i < 20; i++) palette.handleKey('down');
            palette.handleKey('enter');
            // maxVisible=2 → max index is 1
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });
    });

    describe('actions', () => {
        it('Enter calls action of selected command', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('enter');
            expect(cmds[0].action).toHaveBeenCalledTimes(1);
        });

        it('Escape calls onClose', () => {
            const { palette, onClose } = makePalette();
            palette.handleKey('escape');
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('Escape does not crash when onClose is not provided', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });
            expect(() => palette.handleKey('escape')).not.toThrow();
        });
    });

    describe('query editing', () => {
        it('printable characters append to query', () => {
            const { palette } = makePalette();
            palette.handleKey('h');
            palette.handleKey('i');
            expect(palette.getQuery()).toBe('hi');
        });

        it('Backspace removes last query character', () => {
            const { palette } = makePalette();
            'abc'.split('').forEach((ch) => palette.handleKey(ch));
            palette.handleKey('backspace');
            expect(palette.getQuery()).toBe('ab');
        });

        it('Backspace on empty query is a no-op', () => {
            const { palette } = makePalette();
            palette.handleKey('backspace');
            expect(palette.getQuery()).toBe('');
        });
    });

    describe('open()', () => {
        it('resets query and selection', () => {
            const { palette } = makePalette();
            'save'.split('').forEach((ch) => palette.handleKey(ch));
            palette.handleKey('down');
            palette.open();
            expect(palette.getQuery()).toBe('');
        });

        it('after open(), all commands are shown again', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            // Filter down to 'save'
            'save'.split('').forEach((ch) => palette.handleKey(ch));
            // Open resets filter
            palette.open();
            // Now all 4 commands are visible; navigate to last
            for (let i = 0; i < 10; i++) palette.handleKey('down');
            palette.handleKey('enter');
            expect(cmds[3].action).toHaveBeenCalledTimes(1);
        });

        it('marks widget as dirty', () => {
            const { palette } = makePalette();
            (palette as any)._dirty = false;
            palette.open();
            expect(palette.isDirty).toBe(true);
        });
    });

    describe('setCommands()', () => {
        it('updates the command list', () => {
            const { palette } = makePalette();
            const newCmds: Command[] = [
                { id: 'quit', label: 'Quit', action: vi.fn() },
            ];
            palette.setCommands(newCmds);
            palette.handleKey('enter');
            expect(newCmds[0].action).toHaveBeenCalledTimes(1);
        });

        it('re-filters against current query', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            // Set query to 'quit'
            'quit'.split('').forEach((ch) => palette.handleKey(ch));

            // Replace commands with one matching 'quit'
            const newCmds: Command[] = [
                { id: 'quit', label: 'Quit Application', action: vi.fn() },
                { id: 'save', label: 'Save File', action: vi.fn() },
            ];
            palette.setCommands(newCmds);

            // Only 'Quit Application' matches 'quit'
            palette.handleKey('enter');
            expect(newCmds[0].action).toHaveBeenCalledTimes(1);
            expect(newCmds[1].action).not.toHaveBeenCalled();
        });

        it('marks widget as dirty', () => {
            const { palette } = makePalette();
            (palette as any)._dirty = false;
            palette.setCommands([]);
            expect(palette.isDirty).toBe(true);
        });

        it('clamps selectedIndex when new list is shorter', () => {
            const cmds = makeCommands(); // 4 items
            const palette = new CommandPalette({ commands: cmds });
            palette.handleKey('down');
            palette.handleKey('down'); // index 2

            const shortList: Command[] = [
                { id: 'a', label: 'Alpha', action: vi.fn() },
            ];
            palette.setCommands(shortList);
            palette.handleKey('enter');
            expect(shortList[0].action).toHaveBeenCalledTimes(1);
        });
    });

    describe('markDirty()', () => {
        it('handleKey marks widget dirty', () => {
            const { palette } = makePalette();
            (palette as any)._dirty = false;
            palette.handleKey('a');
            expect(palette.isDirty).toBe(true);
        });
    });
    describe('fuzzy search', () => {
        it('matches non-contiguous characters', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            'of'.split('').forEach((ch) => palette.handleKey(ch));

            palette.handleKey('enter');

            expect(cmds[0].action).toHaveBeenCalledTimes(1);
        });

        it('is case-insensitive', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            'OF'.split('').forEach((ch) => palette.handleKey(ch));

            palette.handleKey('enter');

            expect(cmds[0].action).toHaveBeenCalledTimes(1);
        });

        it('returns no matches when characters are missing', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            'xyz'.split('').forEach((ch) => palette.handleKey(ch));

            palette.handleKey('enter');

            cmds.forEach((cmd) =>
                expect(cmd.action).not.toHaveBeenCalled()
            );
        });
        it('ranks exact matches above substring matches above fuzzy matches', () => {
    const cmds: Command[] = [
        {
            id: 'fuzzy',
            label: 'Some Article Variety Example',
            action: vi.fn(),
        },
        {
            id: 'substring',
            label: 'Save File',
            action: vi.fn(),
        },
        {
            id: 'exact',
            label: 'save',
            action: vi.fn(),
        },
    ];

    const palette = new CommandPalette({ commands: cmds });

    'save'.split('').forEach((ch) => palette.handleKey(ch));

    palette.handleKey('enter');

    expect(cmds[2].action).toHaveBeenCalledTimes(1);
    expect(cmds[0].action).not.toHaveBeenCalled();
    expect(cmds[1].action).not.toHaveBeenCalled();
});

it('selects the highest scoring command when multiple matches exist', () => {
    const cmds: Command[] = [
        {
            id: 'save-file',
            label: 'Save File',
            action: vi.fn(),
        },
        {
            id: 'save-all',
            label: 'save',
            action: vi.fn(),
        },
        {
            id: 'save-project',
            label: 'Save Project',
            action: vi.fn(),
        },
    ];

    const palette = new CommandPalette({ commands: cmds });

    'save'.split('').forEach((ch) => palette.handleKey(ch));

    palette.handleKey('enter');

    expect(cmds[1].action).toHaveBeenCalledTimes(1);
    expect(cmds[0].action).not.toHaveBeenCalled();
    expect(cmds[2].action).not.toHaveBeenCalled();
});
    });

    // ── Rendering: placeholder (folded from ui) ──────────────────────────

    describe('placeholder rendering', () => {
        it('shows placeholder text when query is empty', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette({ commands: makeCommands(), placeholder: 'Type a command...' });
            palette.open();
            const screen = renderPalette(palette);
            expect(allText(screen)).toContain('Type a command...');
        });

        it('custom placeholder is rendered', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette({ commands: makeCommands(), placeholder: 'Find action' });
            palette.open();
            const screen = renderPalette(palette);
            expect(allText(screen)).toContain('Find action');
        });
    });

    // ── Rendering: query text (folded from ui) ───────────────────────────

    describe('query rendering', () => {
        it('shows the typed query text', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette({ commands: makeCommands() });
            palette.open();
            'set'.split('').forEach(ch => palette.handleKey(ch));
            const screen = renderPalette(palette);
            expect(allText(screen)).toContain('set');
        });

        it('placeholder does not appear once query is entered', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const placeholder = 'Type to search...';
            const palette = new CommandPalette({ commands: makeCommands(), placeholder });
            palette.open();
            palette.handleKey('o');
            const screen = renderPalette(palette);
            expect(allText(screen)).not.toContain(placeholder);
        });
    });

    // ── Rendering: small width/height guards (folded from ui) ────────────

    describe('small width rendering', () => {
        it('does not throw on a narrow screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette({ commands: makeCommands() });
            palette.open();
            expect(() => renderPalette(palette, 10, 24)).not.toThrow();
        });

        it('does not write out-of-bounds on narrow screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette({ commands: makeCommands() });
            palette.open();
            const w = 8;
            const screen = new Screen(w, 20);
            palette.updateRect({ x: 0, y: 0, width: w, height: 20 });
            expect(() => palette.render(screen)).not.toThrow();
            for (const row of screen.back) {
                expect(row.length).toBeLessThanOrEqual(w);
            }
        });
    });

    describe('small height rendering', () => {
        it('does not throw on a very short screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette({ commands: makeCommands() });
            palette.open();
            expect(() => renderPalette(palette, 80, 4)).not.toThrow();
        });

        it('renders stably on a 1-row screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const palette = new CommandPalette({ commands: makeCommands() });
            palette.open();
            expect(() => renderPalette(palette, 80, 1)).not.toThrow();
        });
    });
});

