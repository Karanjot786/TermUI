// ─────────────────────────────────────────────────────
// @termuijs/quick — Tests for index re-exports
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

describe('quick – index exports useNotifications', () => {
    it('re-exports useNotifications from @termuijs/ui', async () => {
        const mod = await import('./index.js');
        expect(typeof (mod as any).useNotifications).toBe('function');
    });
});

describe('quick – index exports grid (not gridWidget)', () => {
    it('exports grid directly from index', async () => {
        const mod = await import('./index.js');
        expect(typeof (mod as any).grid).toBe('function');
    });
});

describe('quick – index exports batch from @termuijs/store', () => {
    it('re-exports batch from @termuijs/store', async () => {
        const mod = await import('./index.js');
        expect(typeof (mod as any).batch).toBe('function');
    });
});

describe('quick – layout stack', () => {
    it('returns a Widget and stacks children vertically', async () => {
        const mod = await import('./index.js');
        const widget = mod.stack('a', 'b');
        expect(widget.style.flexDirection).toBe('column');
        expect(widget.style.flexGrow).toBe(0);
        expect(widget.children.length).toBe(2);
    });

    it('accepts string children', async () => {
        const mod = await import('./index.js');
        const widget = mod.stack('a');
        expect(widget.children.length).toBe(1);
    });

    it('renders children vertically with correct layout', async () => {
        const { Screen, computeLayout } = await import('@termuijs/core');
        const mod = await import('./index.js');
        const screen = new Screen(20, 10);
        const widget = mod.stack('a', 'b', 'c');
        
        const node = widget.getLayoutNode();
        computeLayout(node, 20, 10);
        widget.syncLayout(node);
        
        widget.render(screen);
        
        const row0 = screen.back[0].map(c => c.char).join('');
        const row1 = screen.back[1].map(c => c.char).join('');
        const row2 = screen.back[2].map(c => c.char).join('');
        
        expect(row0).toContain('a');
        expect(row1).toContain('b');
        expect(row2).toContain('c');
    });
});

describe('quick – layout spacer', () => {
    it('returns a growing Widget', async () => {
        const mod = await import('./index.js');
        const widget = mod.spacer();
        expect(widget.style.flexGrow).toBe(1);
    });

    it('returns a fixed-height Widget', async () => {
        const mod = await import('./index.js');
        const widget = mod.spacer(2);
        expect(widget.style.height).toBe(2);
        expect(widget.style.flexGrow).toBe(0);
    });
});
