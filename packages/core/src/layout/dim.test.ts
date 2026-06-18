import { describe, it, expect } from 'vitest';
import { Dim } from './dim.js';
import type { LayoutContext } from './LayoutContext.js';

describe('Dim Algebra', () => {
    const mockCtx: LayoutContext = {
        parentWidth: 100,
        parentHeight: 50,
        contentWidth: 10,
        contentHeight: 5,
        elementWidth: 0,
        elementHeight: 0,
        elementX: 0,
        elementY: 0,
        axis: 'horizontal',
        getGroupSize: () => 0
    };

    it('Dim.auto() uses content size', () => {
        const auto = Dim.auto();
        expect(auto.dependencies()).toContain('contentSize');
        
        expect(auto.evaluate(mockCtx)).toBe(10);
        
        const vertCtx = { ...mockCtx, axis: 'vertical' as const };
        expect(auto.evaluate(vertCtx)).toBe(5);
    });

    it('Dim.fill() uses available space', () => {
        const fill = Dim.fill(2);
        expect(fill.dependencies()).toContain('parentSize');
        
        expect(fill.evaluate(mockCtx)).toBe(98); // 100 - 2
    });

    it('Dim.func() uses custom lambda', () => {
        const func = Dim.func(ctx => ctx.parentWidth / 2);
        expect(func.evaluate(mockCtx)).toBe(50);
    });
});
