// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Playground widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';

import type { PlaygroundExample } from './Playground.js';

const SAMPLES: PlaygroundExample[] = [
    { id: 'gauge', name: 'Gauge', description: 'A labeled progress bar.', category: 'Data', preview: 'CPU [████░░] 60%', docUrl: 'https://termui.dev/docs/gauge' },
    { id: 'table', name: 'Table', description: 'Tabular data.', category: 'Data', preview: 'a | b\n--+--\n1 | 2' },
    { id: 'button', name: 'Button', description: 'Clickable button.', category: 'Input', preview: '[ OK ]' },
    { id: 'text', name: 'Text', description: 'Styled text.', category: 'Display', preview: 'hello' },
];

/**
 * Build a Playground and render it to a fresh Screen.
 *
 * `unicode` controls the caps.unicode capability by stubbing the environment
 * and re-importing both @termuijs/core and this module so the cached `caps`
 * value is recomputed. This mirrors the Gauge test harness.
 */
async function renderPlayground(examples: PlaygroundExample[] = SAMPLES, unicode = true, width = 60, height = 20) {
    vi.stubEnv('NO_UNICODE', unicode ? '' : '1');
    vi.stubEnv('TERM', '');
    vi.resetModules();

    const { Screen } = await import('@termuijs/core');
    const { Playground } = await import('./Playground.js');

    const pg = new Playground(examples, {}, { title: 'Playground' });
    const screen = new Screen(width, height);
    pg.updateRect({ x: 0, y: 0, width, height });
    pg.render(screen);
    return { pg, screen };
}

function rowText(screen: import('@termuijs/core').Screen, row: number): string {
    return screen.back[row].map(c => c.char).join('').trimEnd();
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Playground', () => {
    it('indexes examples into categories preserving order', async () => {
        const { Playground } = await import('./Playground.js');
        const pg = new Playground(SAMPLES);
        expect(pg.getCategories()).toEqual(['Data', 'Input', 'Display']);
        expect(pg.getExamples()).toHaveLength(4);
    });

    it('selects the first example of the first category by default', async () => {
        const { Playground } = await import('./Playground.js');
        const pg = new Playground(SAMPLES);
        expect(pg.getSelected()?.id).toBe('gauge');
        expect(pg.getSelectedCategoryIndex()).toBe(0);
        expect(pg.getSelectedExampleIndex()).toBe(0);
    });

    it('moves down within a category', async () => {
        const { Playground } = await import('./Playground.js');
        const pg = new Playground(SAMPLES);
        pg.handleKey({ key: 'down' });
        expect(pg.getSelected()?.id).toBe('table');
        expect(pg.getSelectedExampleIndex()).toBe(1);
    });

    it('clamps at the top when moving up', async () => {
        const { Playground } = await import('./Playground.js');
        const pg = new Playground(SAMPLES);
        pg.handleKey({ key: 'up' });
        expect(pg.getSelectedExampleIndex()).toBe(0);
        expect(pg.getSelected()?.id).toBe('gauge');
    });

    it('moves right to the next category and resets the example', async () => {
        const { Playground } = await import('./Playground.js');
        const pg = new Playground(SAMPLES);
        pg.handleKey({ key: 'down' });
        pg.handleKey({ key: 'right' });
        expect(pg.getSelectedCategoryIndex()).toBe(1);
        expect(pg.getSelectedExampleIndex()).toBe(0);
        expect(pg.getSelected()?.id).toBe('button');
    });

    it('clamps at the first category when moving left', async () => {
        const { Playground } = await import('./Playground.js');
        const pg = new Playground(SAMPLES);
        pg.handleKey({ key: 'left' });
        expect(pg.getSelectedCategoryIndex()).toBe(0);
    });

    it('clamps at the last category when moving right past the end', async () => {
        const { Playground } = await import('./Playground.js');
        const pg = new Playground(SAMPLES);
        pg.handleKey({ key: 'right' });
        pg.handleKey({ key: 'right' });
        expect(pg.getSelectedCategoryIndex()).toBe(2);
    });

    it('invokes onSelect for the current example on enter', async () => {
        const { Playground } = await import('./Playground.js');
        const pg = new Playground(SAMPLES);
        const seen: string[] = [];
        pg.onSelect = (ex) => seen.push(ex.id);
        pg.handleKey({ key: 'enter' });
        expect(seen).toEqual(['gauge']);
    });

    it('markDirty is called when selection changes', async () => {
        const { Playground } = await import('./Playground.js');
        const pg = new Playground(SAMPLES);
        pg.clearDirty();
        pg.handleKey({ key: 'down' });
        expect(pg.isDirty).toBe(true);
    });

    it('rebuilds categories when setExamples is called', async () => {
        const { Playground } = await import('./Playground.js');
        const pg = new Playground(SAMPLES);
        pg.setExamples([{ id: 'x', name: 'X', description: 'd', category: 'Misc', preview: 'p' }]);
        expect(pg.getCategories()).toEqual(['Misc']);
        expect(pg.getSelected()?.id).toBe('x');
    });

    it('renders title, category tabs, selected name and preview', async () => {
        const { screen } = await renderPlayground();
        expect(rowText(screen, 0)).toContain('Playground');
        expect(rowText(screen, 1)).toContain('Data');
        const body = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(body).toContain('Gauge');
        expect(body).toContain('CPU');
        expect(body).toContain('A labeled progress bar.');
    });

    it('renders the doc link when present', async () => {
        const { screen } = await renderPlayground(SAMPLES, true, 92, 24);
        const body = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(body).toContain('docs: https://termui.dev/docs/gauge');
    });

    it('uses unicode box characters when unicode is available', async () => {
        const { screen } = await renderPlayground(SAMPLES, true);
        const body = screen.back.map(r => r.map(c => c.char).join('')).join('');
        expect(body).toContain('┌');
        expect(body).toContain('│');
        expect(body).not.toContain('+');
    });

    it('falls back to ASCII when NO_UNICODE=1', async () => {
        const { screen } = await renderPlayground(SAMPLES, false);
        const body = screen.back.map(r => r.map(c => c.char).join('')).join('');
        expect(body).toContain('+');
        expect(body).toContain('-');
        expect(body).not.toMatch(/[┌┐└┘│─▶•]/);
    });

    it('navigates the rendered selection to the second example', async () => {
        const { pg, screen } = await renderPlayground();
        pg.handleKey({ key: 'down' });
        pg.render(screen);
        const body = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(body).toContain('Table');
    });

    it('renders an empty-state message when there are no examples', async () => {
        const { screen } = await renderPlayground([], false, 40, 10);
        expect(rowText(screen, 2)).toContain('(no examples)');
    });
});
