// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for CommandPalette widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { CommandPalette, type Command } from './CommandPalette.js';

function makeCommands(): Command[] {
    return [
        { id: 'open-file',  label: 'Open File',  description: 'Ctrl+O', action: vi.fn() },
        { id: 'save-file',  label: 'Save File',  description: 'Ctrl+S', action: vi.fn() },
        { id: 'find',       label: 'Find',        description: 'Ctrl+F', action: vi.fn() },
        { id: 'open-term',  label: 'Open Terminal', description: 'Ctrl+T', action: vi.fn() },
    ];
}

function makePalette(overrides: Partial<Parameters<typeof CommandPalette>[0]> = {}) {
    const onClose = vi.fn();
    const commands = makeCommands();
    const palette = new CommandPalette({ commands, onClose, ...overrides });
    return { palette, onClose, commands };
}

describe('CommandPalette', () => {
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
            for (let i = 0; i < 10; i++) palette.handleKey('ArrowDown');
            // maxVisible defaults to 8, but only 4 items — so max index is 3
            // We verify by pressing Enter and checking the last command
            const action = (makeCommands()[3].action) as ReturnType<typeof vi.fn>;
            // Rebuild with fresh mocks so we can observe
            const cmds = makeCommands();
            const p2 = new CommandPalette({ commands: cmds });
            for (let i = 0; i < 10; i++) p2.handleKey('ArrowDown');
            p2.handleKey('Enter');
            expect(cmds[3].action).toHaveBeenCalledTimes(1);
        });

        it('typing filters commands by label (case-insensitive)', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            // Type 'open' → should match 'Open File' and 'Open Terminal'
            'open'.split('').forEach((ch) => palette.handleKey(ch));
            expect(palette.getQuery()).toBe('open');

            // Only matching commands reachable: ArrowDown once → index 1 (Open Terminal)
            palette.handleKey('ArrowDown');
            palette.handleKey('Enter');
            // 'Open File' is index 0, 'Open Terminal' is index 1 after filter
            expect(cmds[3].action).toHaveBeenCalledTimes(1); // Open Terminal
        });

        it('filtering by id also works', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            // 'save-file' id contains 'save'
            'save'.split('').forEach((ch) => palette.handleKey(ch));
            palette.handleKey('Enter');
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });

        it('non-matching query shows no results (Enter does nothing)', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            'zzzzz'.split('').forEach((ch) => palette.handleKey(ch));
            palette.handleKey('Enter');
            cmds.forEach((cmd) => expect(cmd.action).not.toHaveBeenCalled());
        });
    });

    describe('navigation', () => {
        it('ArrowDown moves selection down', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('ArrowDown');
            // Selected index is now 1 — verify by Enter calling second command
            palette.handleKey('Enter');
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });

        it('j key also moves selection down', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('j');
            palette.handleKey('Enter');
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });

        it('ArrowUp moves selection up', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('ArrowDown');
            palette.handleKey('ArrowDown');
            palette.handleKey('ArrowUp');
            // Selection should be at index 1
            palette.handleKey('Enter');
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });

        it('k key also moves selection up', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('ArrowDown');
            palette.handleKey('ArrowDown');
            palette.handleKey('k');
            palette.handleKey('Enter');
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });

        it('ArrowUp clamps at index 0', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('ArrowUp');
            palette.handleKey('ArrowUp');
            palette.handleKey('Enter');
            // Should still be index 0
            expect(cmds[0].action).toHaveBeenCalledTimes(1);
        });

        it('ArrowDown clamps at last visible item', () => {
            const cmds = makeCommands(); // 4 commands
            const palette = new CommandPalette({ commands: cmds, maxVisible: 8 });

            for (let i = 0; i < 20; i++) palette.handleKey('ArrowDown');
            palette.handleKey('Enter');
            // Last item is index 3
            expect(cmds[3].action).toHaveBeenCalledTimes(1);
        });

        it('ArrowDown is capped by maxVisible', () => {
            const cmds = makeCommands(); // 4 commands
            const palette = new CommandPalette({ commands: cmds, maxVisible: 2 });

            for (let i = 0; i < 20; i++) palette.handleKey('ArrowDown');
            palette.handleKey('Enter');
            // maxVisible=2 → max index is 1
            expect(cmds[1].action).toHaveBeenCalledTimes(1);
        });
    });

    describe('actions', () => {
        it('Enter calls action of selected command', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });

            palette.handleKey('Enter');
            expect(cmds[0].action).toHaveBeenCalledTimes(1);
        });

        it('Escape calls onClose', () => {
            const { palette, onClose } = makePalette();
            palette.handleKey('Escape');
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('Escape does not crash when onClose is not provided', () => {
            const cmds = makeCommands();
            const palette = new CommandPalette({ commands: cmds });
            expect(() => palette.handleKey('Escape')).not.toThrow();
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
            palette.handleKey('Backspace');
            expect(palette.getQuery()).toBe('ab');
        });

        it('Backspace on empty query is a no-op', () => {
            const { palette } = makePalette();
            palette.handleKey('Backspace');
            expect(palette.getQuery()).toBe('');
        });
    });

    describe('open()', () => {
        it('resets query and selection', () => {
            const { palette } = makePalette();
            'save'.split('').forEach((ch) => palette.handleKey(ch));
            palette.handleKey('ArrowDown');
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
            for (let i = 0; i < 10; i++) palette.handleKey('ArrowDown');
            palette.handleKey('Enter');
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
            palette.handleKey('Enter');
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
            palette.handleKey('Enter');
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
            palette.handleKey('ArrowDown');
            palette.handleKey('ArrowDown'); // index 2

            const shortList: Command[] = [
                { id: 'a', label: 'Alpha', action: vi.fn() },
            ];
            palette.setCommands(shortList);
            palette.handleKey('Enter');
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
});
