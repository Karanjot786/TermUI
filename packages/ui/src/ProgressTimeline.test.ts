// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for ProgressTimeline component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { ProgressTimeline, type TimelineStep } from './ProgressTimeline.js';

const makeSteps = (): TimelineStep[] => [
    { label: 'Plan', status: 'completed', date: 'Mon' },
    { label: 'Build', status: 'active', date: 'Tue' },
    { label: 'Ship', status: 'pending', date: 'Wed' },
];

const renderRow = (screen: Screen, row: number): string =>
    screen.back[row].map(c => c.char).join('');

describe('ProgressTimeline', () => {
    afterEach(() => vi.restoreAllMocks());

    it('is focusable', () => {
        const tl = new ProgressTimeline(makeSteps());
        expect(tl.focusable).toBe(true);
    });

    it('renders vertical timeline with multiple steps', () => {
        const tl = new ProgressTimeline(makeSteps());
        tl.updateRect({ x: 0, y: 0, width: 30, height: 12 });
        const screen = new Screen(30, 12);
        tl.render(screen);

        expect(renderRow(screen, 0)).toContain('Plan');
        expect(renderRow(screen, 1)).toContain('Build');
        expect(renderRow(screen, 2)).toContain('Ship');
    });

    it('renders horizontal timeline with multiple steps', () => {
        const tl = new ProgressTimeline(makeSteps(), {}, { orientation: 'horizontal' });
        tl.updateRect({ x: 0, y: 0, width: 60, height: 6 });
        const screen = new Screen(60, 6);
        tl.render(screen);

        expect(renderRow(screen, 0)).toContain('Plan');
        expect(renderRow(screen, 1)).toContain('Build');
        expect(renderRow(screen, 2)).toContain('Ship');
    });

    it('updates step status via setStepStatus', () => {
        const tl = new ProgressTimeline(makeSteps());
        tl.updateRect({ x: 0, y: 0, width: 30, height: 12 });
        const screen = new Screen(30, 12);

        tl.setStepStatus(2, 'completed');
        expect(tl.getSteps()[2].status).toBe('completed');

        tl.render(screen);
        expect(renderRow(screen, 2)).toContain('Ship');
    });

    it('uses ASCII fallback for icons when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const tl = new ProgressTimeline(makeSteps());
        tl.updateRect({ x: 0, y: 0, width: 30, height: 12 });
        const screen = new Screen(30, 12);
        tl.render(screen);

        const firstRow = renderRow(screen, 0);
        // Completed status falls back to '+' in ASCII mode.
        expect(firstRow).toContain('+');
    });

    it('selects first active step by default', () => {
        const tl = new ProgressTimeline(makeSteps());
        expect(tl.getSelectedIndex()).toBe(1);
    });

    it('moves selection down with down arrow', () => {
        const tl = new ProgressTimeline(makeSteps());
        tl.updateRect({ x: 0, y: 0, width: 30, height: 12 });
        const screen = new Screen(30, 12);

        expect(tl.getSelectedIndex()).toBe(1);
        tl.handleKey({ key: 'down', ctrl: false, alt: false, shift: false } as any);
        expect(tl.getSelectedIndex()).toBe(2);

        tl.render(screen);
        const selectedRow = renderRow(screen, 2);
        // Selected step is highlighted with an inverse video marker.
        const hasCursor = selectedRow.includes('>') || selectedRow.includes('▶');
        expect(hasCursor).toBe(true);
    });

    it('moves selection up with up arrow', () => {
        const tl = new ProgressTimeline(makeSteps());
        tl.updateRect({ x: 0, y: 0, width: 30, height: 12 });
        const screen = new Screen(30, 12);

        expect(tl.getSelectedIndex()).toBe(1);
        tl.handleKey({ key: 'up', ctrl: false, alt: false, shift: false } as any);
        expect(tl.getSelectedIndex()).toBe(0);

        tl.render(screen);
        expect(renderRow(screen, 0)).toContain('Plan');
    });

    it('clamps selection at the boundaries', () => {
        const tl = new ProgressTimeline(makeSteps());
        tl.setSelectedIndex(0);
        tl.handleKey({ key: 'up', ctrl: false, alt: false, shift: false } as any);
        expect(tl.getSelectedIndex()).toBe(0);

        tl.setSelectedIndex(2);
        tl.handleKey({ key: 'down', ctrl: false, alt: false, shift: false } as any);
        expect(tl.getSelectedIndex()).toBe(2);
    });

    it('advances the selected step on enter', () => {
        const tl = new ProgressTimeline(makeSteps());
        tl.updateRect({ x: 0, y: 0, width: 30, height: 12 });
        const screen = new Screen(30, 12);

        tl.setSelectedIndex(0);
        expect(tl.getSteps()[0].status).toBe('completed');
        expect(tl.getSteps()[1].status).toBe('active');

        tl.handleKey({ key: 'enter', ctrl: false, alt: false, shift: false } as any);

        const steps = tl.getSteps();
        expect(steps[0].status).toBe('completed');
        expect(steps[1].status).toBe('completed');
        expect(steps[2].status).toBe('active');
        expect(tl.getSelectedIndex()).toBe(1);

        tl.render(screen);
        expect(renderRow(screen, 1)).toContain('Build');
    });

    it('ignores unsupported keys without changing selection', () => {
        const tl = new ProgressTimeline(makeSteps());
        expect(tl.getSelectedIndex()).toBe(1);
        tl.handleKey({ key: 'x', ctrl: false, alt: false, shift: false } as any);
        expect(tl.getSelectedIndex()).toBe(1);
    });

    it('renders a cursor marker on the selected step in horizontal mode', () => {
        const tl = new ProgressTimeline(makeSteps(), {}, { orientation: 'horizontal' });
        tl.updateRect({ x: 0, y: 0, width: 60, height: 6 });
        const screen = new Screen(60, 6);
        tl.setSelectedIndex(1);
        tl.render(screen);

        const selectedRow = renderRow(screen, 0);
        expect(selectedRow).toMatch(/[>▶]/);
    });
});
