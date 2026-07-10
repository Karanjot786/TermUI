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

    it('Dim.fill() uses available space across both layout axes', () => {
        const fill = Dim.fill(2);
        expect(fill.dependencies()).toContain('parentSize');
        
        // 1. Horizontal Axis Check (parentWidth: 100)
        expect(fill.evaluate(mockCtx)).toBe(98); // 100 - 2

        // 2. Vertical Axis Check (parentHeight: 50)
        const vertCtx = { ...mockCtx, axis: 'vertical' as const };
        expect(fill.evaluate(vertCtx)).toBe(48); // 50 - 2
    });

    it('Dim algebra engine supports chaining math operators and composition properties', () => {
        // 1. Chaining Math Operators
        const fillMinusMargin = Dim.fill(2).sub(5);
        const autoPlusOffset = Dim.auto().add(10);

        expect(fillMinusMargin.evaluate(mockCtx)).toBe(93); // (100 - 2) - 5
        expect(autoPlusOffset.evaluate(mockCtx)).toBe(20);   // 10 + 10

        // 2. Layout Composition Utilities
        const responsiveWidth = Dim.max(Dim.auto(), Dim.func(ctx => ctx.parentWidth * 0.3));
        expect(responsiveWidth.evaluate(mockCtx)).toBe(30);  // max(10, 30)

        // 3. Automated Dependency Flag Merging
        expect(fillMinusMargin.dependencies()).toContain('parentSize');
        expect(autoPlusOffset.dependencies()).toContain('contentSize');
        expect(responsiveWidth.dependencies()).toContain('contentSize');
    });
});
