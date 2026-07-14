import { describe, it, expect, vi, afterEach } from 'vitest';
import type { KeyEvent } from '@termuijs/core';

function makeKey(key: string): KeyEvent {
    return {
        key,
        shift: false,
        ctrl: false,
        alt: false,
        raw: Buffer.alloc(0),
        stopPropagation: () => {},
        preventDefault: () => {},
    };
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('RangeInput', () => {
    it('constructs with low=min, high=max', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price');
        expect(r.getLow()).toBe(0);
        expect(r.getHigh()).toBe(100);
    });

    it('constructs with custom low and high and clamps them', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price', {}, { min: 10, max: 90, low: 30, high: 70 });
        expect(r.getLow()).toBe(30);
        expect(r.getHigh()).toBe(70);

        const clamped = new RangeInput('Price', {}, { min: 10, max: 90, low: 5, high: 95 });
        expect(clamped.getLow()).toBe(10);
        expect(clamped.getHigh()).toBe(90);
    });

    it('clamps low and high into range when both are out of range on the same side', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price', {}, { min: 10, max: 90, low: 95, high: 95 });
        expect(r.getLow()).toBeGreaterThanOrEqual(10);
        expect(r.getLow()).toBeLessThanOrEqual(90);
        expect(r.getHigh()).toBeGreaterThanOrEqual(10);
        expect(r.getHigh()).toBeLessThanOrEqual(90);
        expect(r.getLow()).toBeLessThanOrEqual(r.getHigh());
        expect(r.getLow()).toBe(90);
        expect(r.getHigh()).toBe(90);
    });

    it('setLow and setHigh work', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price');
        r.setLow(20);
        r.setHigh(80);
        expect(r.getLow()).toBe(20);
        expect(r.getHigh()).toBe(80);
    });

    it('setLow clamps to min and cannot exceed high', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price');
        r.setHigh(50);
        r.setLow(90);  // exceeds high → clamps to high
        expect(r.getLow()).toBe(50);
        r.setLow(-10); // below min → clamps to min
        expect(r.getLow()).toBe(0);
    });

    it('setHigh clamps to max and cannot go below low', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price');
        r.setLow(50);
        r.setHigh(10);  // below low → clamps to low
        expect(r.getHigh()).toBe(50);
        r.setHigh(200); // above max → clamps to max
        expect(r.getHigh()).toBe(100);
    });

    it('setRange sets both values', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price');
        r.setRange(20, 80);
        expect(r.getLow()).toBe(20);
        expect(r.getHigh()).toBe(80);
    });

    it('tab toggles active handle', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price');
        r.setRange(20, 80);
        r.handleKey(makeKey('tab'));
        r.handleKey(makeKey('right'));
        expect(r.getHigh()).toBe(81); // high handle moved
        expect(r.getLow()).toBe(20);  // low unchanged
    });

    it('prevents default tab focus behavior when toggling handles', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price');
        const event = makeKey('tab');
        const preventDefault = vi.fn();
        const stopPropagation = vi.fn();

        event.preventDefault = preventDefault;
        event.stopPropagation = stopPropagation;

        r.handleKey(event);

        expect(preventDefault).toHaveBeenCalled();
        expect(stopPropagation).toHaveBeenCalled();
    });

    it('arrow keys move low handle by step', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price');
        r.handleKey(makeKey('right'));
        expect(r.getLow()).toBe(1);
        r.handleKey(makeKey('left'));
        expect(r.getLow()).toBe(0);
    });

    it('onChange fires when low or high changes', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const onChange = vi.fn();
        const r = new RangeInput('Price', {}, { onChange });

        r.setLow(20);
        expect(onChange).toHaveBeenCalledWith(20, 100);

        r.setHigh(80);
        expect(onChange).toHaveBeenCalledWith(20, 80);

        r.setRange(30, 70);
        expect(onChange).toHaveBeenCalledWith(30, 70);

        expect(onChange).toHaveBeenCalledTimes(3);
    });

    it('onChange does not fire when value is unchanged', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const onChange = vi.fn();
        const r = new RangeInput('Price', {}, { onChange });

        r.setLow(0); // already 0
        r.setHigh(100); // already 100
        expect(onChange).not.toHaveBeenCalled();
    });

    it('onChange fires via arrow key', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const onChange = vi.fn();
        const r = new RangeInput('Price', {}, { onChange });

        r.handleKey(makeKey('right')); // low 0 → 1
        expect(onChange).toHaveBeenCalledWith(1, 100);
    });

    it('arrow keys clamp low handle at min boundary', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price');
        r.handleKey(makeKey('left')); // already at min (0), should stay 0
        expect(r.getLow()).toBe(0);
    });

    it('arrow keys clamp high handle at max boundary', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price');
        r.handleKey(makeKey('tab')); // switch to high handle
        r.handleKey(makeKey('right')); // already at max (100), should stay 100
        expect(r.getHigh()).toBe(100);
    });

    it('respects custom step option for arrow key movement', async () => {
        const { RangeInput } = await import('./RangeInput.js');
        const r = new RangeInput('Price', {}, { step: 5 });
        r.handleKey(makeKey('right')); // low 0 → 5
        expect(r.getLow()).toBe(5);
        r.handleKey(makeKey('right')); // low 5 → 10
        expect(r.getLow()).toBe(10);
    });

    it('renders unicode track chars', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { RangeInput } = await import('./RangeInput.js');

        const r = new RangeInput('Price');
        r.setRange(20, 80);
        r.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        const screen = new Screen(40, 1);
        r.render(screen);

        const row = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(row).toMatch(/[█░]/);
        expect(row).not.toContain('#');
    });

    it('renders ASCII track chars when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { RangeInput } = await import('./RangeInput.js');

        const r = new RangeInput('Price');
        r.setRange(20, 80);
        r.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        const screen = new Screen(40, 1);
        r.render(screen);

        const row = screen.back[0].map((cell: { char: string }) => cell.char).join('');
        expect(row).toContain('#');
        expect(row).toContain('-');
        expect(row).not.toMatch(/[█░]/);
    });
});
