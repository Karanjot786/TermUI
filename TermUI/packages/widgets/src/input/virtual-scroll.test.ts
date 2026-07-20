import { describe, it, expect } from 'vitest';
import { computeRange, computeVariableRange } from './virtual-scroll.js';

describe('computeRange', () => {
    it('start=0, end=12 with default overscan=2 at offset 0', () => {
        const r = computeRange(0, 10, 100);
        expect(r.start).toBe(0);
        expect(r.end).toBe(12);
    });

    it('start=48, end=62 at offset 50', () => {
        const r = computeRange(50, 10, 100);
        expect(r.start).toBe(48);
        expect(r.end).toBe(62);
    });

    it('end is clamped at itemCount when near the end', () => {
        const r = computeRange(95, 10, 100);
        expect(r.end).toBe(100);
    });

    it('no overscan when overscan=0', () => {
        const r = computeRange(2, 10, 100, 0);
        expect(r.start).toBe(2);
        expect(r.end).toBe(12);
    });

    it('end is clamped when itemCount is smaller than viewport', () => {
        const r = computeRange(0, 10, 5);
        expect(r.end).toBe(5);
    });

    it('offsetPx equals start', () => {
        const r = computeRange(10, 5, 100, 2);
        expect(r.offsetPx).toBe(r.start);
    });
});

describe('computeVariableRange', () => {
    // sizes: [10, 20, 30, 40] → cumulative starts: [0, 10, 30, 60], total: 100
    it('includes all items when viewport covers everything', () => {
        const r = computeVariableRange(0, 100, [10, 20, 30, 40]);
        expect(r.start).toBe(0);
        expect(r.end).toBe(4);
    });

    it('skips first item (ends at px 10) when scrollPx=15, viewportPx=30', () => {
        // viewport covers px 15–45
        // item 0: 0–10 (ends before scroll start → not visible)
        // item 1: 10–30 → visible
        // item 2: 30–60 → visible
        // item 3: 60–100 → starts after viewport end (45)
        // with overscan=2: start = max(0, 1-2)=0, end = min(4, endIdx+2)
        const r = computeVariableRange(15, 30, [10, 20, 30, 40]);
        // startIdx without overscan would be 1 (first item with c+size > 15 is index 1: 10+20=30 > 15)
        // with overscan 2: start = max(0, 1-2) = 0
        // endIdx: cumulative >= 45 is index 3 (c=60), so endIdx=3, +2 = min(4, 5)=4
        expect(r.start).toBe(0);
        expect(r.end).toBe(4);
        // offsetPx is cumulative[start=0] = 0
        expect(r.offsetPx).toBe(0);
    });

    it('correctly computes offsetPx for a non-zero start', () => {
        // sizes: 10 items of height 10 each
        // cumulative: 0, 10, 20, ... 90; total 100
        // scrollPx=25, viewportPx=10 → viewport covers 25-35
        // First visible without overscan: index 3 (c=30, 30+10=40 > 25? no; index 2: 20+10=30 > 25 yes → startIdx=2)
        // with overscan 2: start = max(0, 2-2) = 0
        const sizes = Array(10).fill(10) as number[];
        const r = computeVariableRange(25, 10, sizes);
        expect(r.start).toBe(0); // clamped by overscan
        expect(r.offsetPx).toBe(0); // cumulative[0]
    });

    it('returns empty-like range for scroll past all items', () => {
        const r = computeVariableRange(200, 10, [10, 20, 30]);
        // no item visible; startIdx = sizes.length = 3, then max(0,3-2)=1
        // endIdx = sizes.length = 3, +2 = min(3,5)=3
        expect(r.start).toBeLessThanOrEqual(r.end);
    });
});
