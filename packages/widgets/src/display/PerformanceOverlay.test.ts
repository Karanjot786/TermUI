import { describe, expect, it } from 'vitest';
import { Screen } from '@termuijs/core';
import { PerformanceOverlay } from './PerformanceOverlay.js';

function screenText(screen: Screen): string {
    return screen.back
        .map(row => row.map(cell => cell.char).join(''))
        .join('\n');
}

describe('PerformanceOverlay', () => {
    it('marks dirty when stats are updated', () => {
        const overlay = new PerformanceOverlay();

        overlay.clearDirty();

        overlay.updateStats({
            durationMs: 2.5,
            cellsChanged: 100,
            bytesWritten: 512,
        });

        expect(overlay.isDirty).toBe(true);
    });

    it('stores updated stats', () => {
        const overlay = new PerformanceOverlay();

        overlay.updateStats({
            durationMs: 3.1,
            cellsChanged: 50,
            bytesWritten: 200,
        });

        expect(overlay.stats.durationMs).toBe(3.1);
        expect(overlay.stats.cellsChanged).toBe(50);
        expect(overlay.stats.bytesWritten).toBe(200);
    });

    it('renders frame duration', () => {
        const overlay = new PerformanceOverlay();

        overlay.updateStats({
            durationMs: 2.5,
            cellsChanged: 100,
            bytesWritten: 512,
        });

        overlay.updateRect({
            x: 0,
            y: 0,
            width: 30,
            height: 5,
        });

        const screen = new Screen(30, 5);

        overlay.render(screen);

        expect(screenText(screen)).toContain('Frame: 2.5ms');
    });

    it('renders cells changed', () => {
        const overlay = new PerformanceOverlay();

        overlay.updateStats({
            durationMs: 1.0,
            cellsChanged: 123,
            bytesWritten: 512,
        });

        overlay.updateRect({
            x: 0,
            y: 0,
            width: 30,
            height: 5,
        });

        const screen = new Screen(30, 5);

        overlay.render(screen);

        expect(screenText(screen)).toContain('Cells: 123');
    });

    it('renders bytes written', () => {
        const overlay = new PerformanceOverlay();

        overlay.updateStats({
            durationMs: 1.0,
            cellsChanged: 123,
            bytesWritten: 2048,
        });

        overlay.updateRect({
            x: 0,
            y: 0,
            width: 30,
            height: 5,
        });

        const screen = new Screen(30, 5);

        overlay.render(screen);

        expect(screenText(screen)).toContain('Bytes: 2048');
    });
});