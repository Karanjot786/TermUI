// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Timeline widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen, caps, stringWidth } from '@termuijs/core';
import { Timeline, type TimelineItem } from './Timeline.js';

function renderList(
    items: TimelineItem[],
    width = 40,
    height = 20,
): { widget: Timeline; screen: Screen } {
    const widget = new Timeline(items);
    const screen = new Screen(width, height);
    widget.updateRect({ x: 0, y: 0, width, height });
    widget.render(screen);
    return { widget, screen };
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

function cellAt(screen: Screen, row: number, col: number) {
    return screen.back[row]?.[col];
}

describe('Timeline', () => {

    it('renders items with connectors', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const items: TimelineItem[] = [
            { title: 'Init', status: 'done' },
            { title: 'Build', status: 'active' },
            { title: 'Deploy', status: 'pending' },
        ];
        const { screen } = renderList(items);

        expect(rowText(screen, 0)).toContain('Init');
        expect(rowText(screen, 1)).toContain('Build');
        expect(rowText(screen, 2)).toContain('Deploy');

        expect(cellAt(screen, 0, 0)?.char).toBe('\u251C'); // ├
        expect(cellAt(screen, 0, 1)?.char).toBe('\u2500'); // ─
        expect(cellAt(screen, 2, 0)?.char).toBe('\u2514'); // └
    });

    it('last item uses └─ instead of ├─', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const items: TimelineItem[] = [
            { title: 'First' },
            { title: 'Second' },
        ];
        const { screen } = renderList(items);

        expect(cellAt(screen, 0, 0)?.char).toBe('\u251C'); // ├
        expect(cellAt(screen, 1, 0)?.char).toBe('\u2514'); // └
    });

    it('status colors: active is bold/cyan, done is green', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const items: TimelineItem[] = [
            { title: 'Done', status: 'done' },
            { title: 'Active', status: 'active' },
            { title: 'Pending', status: 'pending' },
        ];
        const { screen } = renderList(items);

        // done — green connector
        const doneCell = cellAt(screen, 0, 0);
        expect(doneCell?.fg).toEqual({ type: 'named', name: 'green' });

        // active — cyan/bold connector
        const activeCell = cellAt(screen, 1, 0);
        expect(activeCell?.fg).toEqual({ type: 'named', name: 'cyan' });
        expect(activeCell?.bold).toBe(true);

        // pending — dim connector
        const pendingCell = cellAt(screen, 2, 0);
        expect(pendingCell?.dim).toBe(true);
    });

    it('time is shown when provided', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const items: TimelineItem[] = [
            { title: 'Task', time: '2s', status: 'done' },
        ];
        const { screen } = renderList(items, 20);

        const text = rowText(screen, 0);
        expect(text).toContain('2s');
    });

    it('setItems updates the list', () => {
        const { widget, screen } = renderList([
            { title: 'Old', status: 'done' },
        ]);

        expect(rowText(screen, 0)).toContain('Old');

        widget.clearDirty();
        widget.setItems([
            { title: 'New', status: 'pending' },
        ]);
        expect(widget.isDirty).toBe(true);

        const nextScreen = new Screen(40, 20);
        widget.render(nextScreen);
        expect(rowText(nextScreen, 0)).toContain('New');
    });

    it('clips long titles before right-aligned time text', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const widget = new Timeline([
            {
                title: 'A very long deployment step name',
                time: '12:34',
                status: 'active',
            },
        ]);
        const screen = new Screen(16, 1);
        const writeSpy = vi.spyOn(screen, 'writeString');

        widget.updateRect({ x: 0, y: 0, width: 16, height: 1 });
        widget.render(screen);

        for (const call of writeSpy.mock.calls) {
            expect(call[0] + stringWidth(String(call[2]))).toBeLessThanOrEqual(16);
        }

        expect(rowText(screen, 0)).toContain('12:34');
    });
});
