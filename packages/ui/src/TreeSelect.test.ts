// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for TreeSelect component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { TreeSelect } from './TreeSelect.js';

// KeyEvent stub — tests only need the `key` field; cast avoids importing the full KeyEvent type
function key(k: string) {
    return { key: k } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const ROOTS = [
    {
        label: 'src',
        value: 's',
        expanded: true,
        children: [
            { label: 'a.ts', value: 'a' },
            { label: 'b.ts', value: 'b' },
        ],
    },
    { label: 'lib', value: 'l' },
];

describe('TreeSelect', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('down moves cursor and renders highlight', () => {
        const screen = new Screen(30, 6);
        const ts = new TreeSelect(ROOTS);
        ts.updateRect({ x: 0, y: 0, width: 30, height: 6 });

        ts.handleKey(key('down'));
        ts.render(screen);

        expect(screen.back[1].some(cell => cell.bold)).toBe(true);
        expect(screen.back[0].some(cell => cell.bold)).toBe(false);
    });

    it('space selects cursor node', () => {
        const screen = new Screen(30, 6);
        const ts = new TreeSelect(ROOTS);
        ts.updateRect({ x: 0, y: 0, width: 30, height: 6 });

        ts.handleKey(key('space'));
        expect(ts.selectedValues).toEqual(['s']);
    });

    it('single mode replaces prior selection', () => {
        const ts = new TreeSelect(ROOTS, { multiple: false });

        ts.handleKey(key('space'));
        expect(ts.selectedValues).toEqual(['s']);

        ts.handleKey(key('down'));
        ts.handleKey(key('space'));
        expect(ts.selectedValues).toEqual(['a']);
    });

    it('multi mode accumulates selections', () => {
        const ts = new TreeSelect(ROOTS, { multiple: true });

        ts.handleKey(key('space'));
        ts.handleKey(key('down'));
        ts.handleKey(key('space'));

        expect(ts.selectedValues).toContain('s');
        expect(ts.selectedValues).toContain('a');
        expect(ts.selectedValues).toHaveLength(2);
    });

    it('ASCII fallback markers render when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const screen = new Screen(30, 6);
        const ts = new TreeSelect(ROOTS);
        ts.updateRect({ x: 0, y: 0, width: 30, height: 6 });

        ts.handleKey(key('space'));
        ts.render(screen);

        const rendered = screen.back
            .map(row => row.map(cell => cell.char).join(''))
            .join('\n');

        expect(rendered).toContain('v ');
        expect(rendered).toContain('* ');
        expect(rendered).toContain('o ');
    });

    it('navigates nested nodes with down and space in multi mode', () => {
        const roots = [{ label: 'src', value: 's', expanded: true, children: [{ label: 'a.ts', value: 'a' }] }];
        const screen = new Screen(30, 6);
        const ts = new TreeSelect(roots, { multiple: true });
        ts.updateRect({ x: 0, y: 0, width: 30, height: 6 });
        ts.handleKey(key('down'));
        ts.handleKey(key('space'));
        expect(ts.selectedValues).toContain('a');
    });
});
