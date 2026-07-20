import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { Pagination } from './Pagination.js';

describe('Pagination', () => {
    it('renders page/total text', () => {
        const p = new Pagination(3, 10);
        p.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        const screen = new Screen(20, 1);
        p.render(screen);
        const rendered = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(rendered).toContain('<');
        expect(rendered).toContain('>');
        expect(rendered).toContain('3 / 10');
    });

    it('left navigation decrements page and calls onChange', () => {
        const onChange = vi.fn();
        const p = new Pagination(3, 5, { onChange });
        const spy = vi.spyOn(p as any, 'markDirty');
        p.handleKey({ key: 'left', ctrl: false, alt: false } as any);
        expect(p.page).toBe(2);
        expect(onChange).toHaveBeenCalledWith(2);
        expect(spy).toHaveBeenCalled();
    });

    it('right navigation increments page and calls onChange', () => {
        const onChange = vi.fn();
        const p = new Pagination(2, 5, { onChange });
        const spy = vi.spyOn(p as any, 'markDirty');
        p.handleKey({ key: 'l', ctrl: false, alt: false } as any);
        expect(p.page).toBe(3);
        expect(onChange).toHaveBeenCalledWith(3);
        expect(spy).toHaveBeenCalled();
    });

    it('clamps at boundaries and does not call onChange when unchanged', () => {
        const onChange = vi.fn();
        const p1 = new Pagination(1, 5, { onChange });
        p1.handleKey({ key: 'h', ctrl: false, alt: false } as any);
        expect(p1.page).toBe(1);
        expect(onChange).not.toHaveBeenCalled();

        const p2 = new Pagination(5, 5, { onChange });
        p2.handleKey({ key: 'right', ctrl: false, alt: false } as any);
        expect(p2.page).toBe(5);
        expect(onChange).not.toHaveBeenCalled();
    });
});
