// ─────────────────────────────────────────────────────
// Todo App — built with @termuijs/quick
//
// Showcases: multiProgress, commandPalette, batch, caps
// ─────────────────────────────────────────────────────

import { app, list, input, text, multiProgress, commandPalette } from '@termuijs/quick';
import { batch } from '@termuijs/store';
import { caps } from '@termuijs/core';

const todos: string[] = ['Learn TermUI', 'Build a CLI app', 'Ship to npm'];

const done = () => todos.filter(t => t.startsWith('[x] ')).length;
const total = () => Math.max(todos.length, 1);

app(caps.unicode ? '✅ Todo App' : '[x] Todo App')
    .rows(
        // Summary line
        text(() => `${done()}/${todos.length} done`, {
            bold: true,
            color: { type: 'named', name: 'green' },
        }),
        // Dual progress bars (Done / Pending)
        multiProgress(() => [
            { label: 'Done', value: done() / total() },
            { label: 'Pending', value: (todos.length - done()) / total() },
        ]),
        // Command palette: Clear Done, Quit
        commandPalette([
            {
                label: 'Clear Done',
                description: 'x',
                action: () => batch(() => {
                    const keep = todos.filter(t => !t.startsWith('[x] '));
                    todos.length = 0;
                    todos.push(...keep);
                }),
            },
            { label: 'Quit', description: 'q', action: () => process.exit(0) },
        ]),
        // Todo list
        list(() => todos, {
            selectable: true,
            onSelect: (idx: number) => {
                todos[idx] = todos[idx].startsWith('[x] ')
                    ? todos[idx].slice(4)
                    : `[x] ${todos[idx]}`;
            },
        }),
        // Input to add new todos
        input('Type a todo and press Enter...', {
            onSubmit: (value: string) => batch(() => {
                if (value.trim()) todos.push(value.trim());
            }),
        }),
    )
    .keys({ x: 'clear done', q: 'quit', '↑↓': 'navigate', '⏎': 'toggle/add' })
    .refresh('500ms')
    .run();
