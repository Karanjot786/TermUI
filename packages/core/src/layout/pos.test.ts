import { describe, it, expect } from 'vitest';
import { Pos } from './pos.js';
import type { LayoutContext } from './LayoutContext.js';

describe('Pos Algebra', () => {
    const mockCtx: LayoutContext = {
        parentWidth: 100,
        parentHeight: 50,
        contentWidth: 10,
        contentHeight: 10,
        elementWidth: 20,
        elementHeight: 5,
        elementX: 0,
        elementY: 0,
        axis: 'horizontal',
        getGroupSize(id) { return id === 'g1' ? 40 : 0; }
    };

    it('Pos.center() centers an element', () => {
        const center = Pos.center();
        expect(center.dependencies()).toContain('elementSize');
        // (100 - 20) / 2 = 40
        expect(center.evaluate(mockCtx)).toBe(40);
        
        const vertCtx = { ...mockCtx, axis: 'vertical' as const };
        // (50 - 5) / 2 = 22
        expect(center.evaluate(vertCtx)).toBe(22);
    });

    it('Pos.anchorEnd() anchors to the end', () => {
        const end = Pos.anchorEnd(5);
        // 100 - 20 - 5 = 75
        expect(end.evaluate(mockCtx)).toBe(75);
    });

    it('Pos.align() aligns within a group', () => {
        const alignStart = Pos.align('start', 'g1');
        const alignCenter = Pos.align('center', 'g1');
        const alignEnd = Pos.align('end', 'g1');

        // groupSize = 40. parentWidth = 100. elementWidth = 20.
        // center group offset: (100 - 40) / 2 = 30
        // end group offset: 100 - 40 = 60
        
        // internal offset: (40 - 20) / 2 = 10
        // alignCenter => 30 + 10 = 40
        expect(alignCenter.evaluate(mockCtx)).toBe(40);

        // alignEnd => 60 + 10 = 70
        expect(alignEnd.evaluate(mockCtx)).toBe(70);
    });
});
