// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for ShortcutBar widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { ShortcutBar, type ShortcutItem } from './ShortcutBar.js';
import { Screen, caps, createKeyEvent } from '@termuijs/core';

function renderShortcutBar(
    items: ShortcutItem[],
    style: Partial<Style> = {},
    opts: ShortcutBarOptions = {},
    width = 40,
    height = 1,
) {
    const bar = new ShortcutBar(items, style, opts);
    const screen = new Screen(width, height);
    bar.updateRect({ x: 0, y: 0, width, height });
    bar.render(screen);
    return { bar, screen };
}

function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(c => c.char).join('').trimEnd();
}

describe('ShortcutBar', () => {
    it('renders horizontal items with default keys and labels', () => {
        const items = [
            { key: 'F1', label: 'Help' },
            { key: 'F10', label: 'Quit' },
        ];
        const { screen } = renderShortcutBar(items);
        const text = rowText(screen, 0);

        expect(text).toContain('[F1] Help');
        expect(text).toContain('[F10] Quit');
    });

    it('renders separator between items', () => {
        const items = [
            { key: 'F1', label: 'Help' },
            { key: 'F10', label: 'Quit' },
        ];
        const { screen } = renderShortcutBar(items, {}, { separator: ' | ' });
        const text = rowText(screen, 0);

        expect(text).toContain('[F1] Help | [F10] Quit');
    });

    it('uses custom styles for key and labels', () => {
        const items = [{ key: 'F1', label: 'Help' }];
        const keyStyle = { fg: { type: 'named' as const, name: 'green' as const } };
        const labelStyle = { fg: { type: 'named' as const, name: 'yellow' as const } };
        const { screen } = renderShortcutBar(items, {}, { keyStyle, labelStyle });

        // First bracket at [0][0]
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'green' });
        // The space and H at [0][4] and [0][5] should have the label style
        expect(screen.back[0][5].fg).toEqual({ type: 'named', name: 'yellow' });
    });


    it('truncates labels if screen size is too small', () => {
        const items = [{ key: 'F1', label: 'SuperLongLabelString' }];
        // Total width 10: "[F1] " is 5 chars, leaving 5 chars for label
        const { screen } = renderShortcutBar(items, {}, {}, 10);
        const text = rowText(screen, 0);

        expect(text).toContain('[F1]');
        expect(text).not.toContain('SuperLongLabelString');
    });

    it('delegates and triggers matching actions in handleKey', () => {
        let helpTriggered = false;
        let quitTriggered = false;
        const items = [
            { key: 'F1', label: 'Help', action: () => { helpTriggered = true; } },
            { key: 'F10', label: 'Quit', action: () => { quitTriggered = true; } },
        ];
        const bar = new ShortcutBar(items);

        bar.handleKey(createKeyEvent({ key: 'F1' }));
        expect(helpTriggered).toBe(true);
        expect(quitTriggered).toBe(false);

        bar.handleKey(createKeyEvent({ key: 'f10' })); // test case-insensitive matching
        expect(quitTriggered).toBe(true);
    });

    it('mutators mark widget as dirty', () => {
        const bar = new ShortcutBar([]);
        expect(bar.isDirty).toBe(true);

        bar.clearDirty();
        expect(bar.isDirty).toBe(false);

        bar.setItems([{ key: 'F1', label: 'Help' }]);
        expect(bar.isDirty).toBe(true);
        expect(bar.getItems().length).toBe(1);

        bar.clearDirty();
        bar.setSeparator('---');
        expect(bar.isDirty).toBe(true);
        expect(bar.getSeparator()).toBe('---');

        bar.clearDirty();
        bar.setStyles({ fg: { type: 'named', name: 'red' } });
        expect(bar.isDirty).toBe(true);
    });
});
