// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for ProgressBar widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { ProgressBar } from './ProgressBar.js';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('ProgressBar', () => {
    it('initializes with default value 0', () => {
        const pb = new ProgressBar();
        expect(pb.value).toBe(0);
    });

    it('setValue sets progress to 0.5', () => {
        const pb = new ProgressBar();
        pb.setValue(0.5);
        expect(pb.value).toBe(0.5);
    });

    it('setValue(1) sets to 100%', () => {
        const pb = new ProgressBar();
        pb.setValue(1);
        expect(pb.value).toBe(1);
    });

    it('clamps values above 1 to 1', () => {
        const pb = new ProgressBar();
        pb.setValue(1.5);
        expect(pb.value).toBe(1);
    });

    it('clamps values below 0 to 0', () => {
        const pb = new ProgressBar();
        pb.setValue(-0.5);
        expect(pb.value).toBe(0);
    });
        it('handles negative initialization by clamping to 0', () => {
        const pb = new ProgressBar({}, { value: -0.5 });
        expect(pb.value).toBe(0);
    });

    it('handles value above 1 by clamping to 1', () => {
        const pb = new ProgressBar({}, { value: 1.5 });
        expect(pb.value).toBe(1);
    });
});

describe('ProgressBar — rendering', () => {
    it('value: 0 renders all empty cells', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { ProgressBar } = await import('./ProgressBar.js');

        const pb = new ProgressBar({}, { value: 0, showLabel: false });
        pb.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        pb.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).not.toContain('#');
        expect(rendered).toContain('-');
    });

    it('value: 1 renders all fill cells', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { ProgressBar } = await import('./ProgressBar.js');

        const pb = new ProgressBar({}, { value: 1, showLabel: false });
        pb.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        pb.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toContain('#');
        expect(rendered).not.toContain('-');
    });

    it('value: 0.5 renders half fill half empty', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { ProgressBar } = await import('./ProgressBar.js');

        const pb = new ProgressBar({}, { value: 0.5, showLabel: false });
        pb.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        pb.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toContain('#');
        expect(rendered).toContain('-');
    });

    it('showLabel: true renders percentage text', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { ProgressBar } = await import('./ProgressBar.js');

        const pb = new ProgressBar({}, { value: 0.5, showLabel: true });
        pb.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        pb.render(screen);

        const rendered = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(rendered).toContain('50%');
    });

    it('fillColor applies to filled cells', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { ProgressBar } = await import('./ProgressBar.js');

        const pb = new ProgressBar({}, { 
            value: 1, 
            showLabel: false,
            fillColor: { type: 'named', name: 'red' }
        });
        pb.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        pb.render(screen);

        const filledCell = screen.back[0][0];
        expect(filledCell.fg).toEqual({ type: 'named', name: 'red' });
    });
});

describe('ProgressBar — ASCII fallback', () => {
    it('uses "#" for fill and "-" for empty when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { ProgressBar } = await import('./ProgressBar.js');
        const pb = new ProgressBar();
        const fillChar = (pb as unknown as { _fillChar: string })._fillChar;
        const emptyChar = (pb as unknown as { _emptyChar: string })._emptyChar;
        expect(fillChar).toBe('#');
        expect(emptyChar).toBe('-');
    });

    it('uses "█" for fill when unicode is available', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { ProgressBar } = await import('./ProgressBar.js');
        const pb = new ProgressBar();
        const fillChar = (pb as unknown as { _fillChar: string })._fillChar;
        expect(fillChar).toBe('█');
    });

    it('preserves user-supplied fillChar when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { ProgressBar } = await import('./ProgressBar.js');
        const pb = new ProgressBar({}, { fillChar: '=' });
        const fillChar = (pb as unknown as { _fillChar: string })._fillChar;
        expect(fillChar).toBe('=');
    });
});
