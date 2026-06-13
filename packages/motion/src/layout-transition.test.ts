import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Rect } from '@termuijs/core';

async function advanceSpring(ms: number) {
    const steps = Math.ceil(ms / 16);
    for (let i = 0; i < steps; i++) {
        vi.advanceTimersByTime(16);
        await Promise.resolve();
    }
}

describe('animateRect', () => {
    let animateRect: typeof import('./layout-transition.js').animateRect;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.unstubAllEnvs();
        vi.stubEnv('NO_MOTION', '');
        vi.stubEnv('CI', '');
        vi.resetModules();
        const mod = await import('./layout-transition.js');
        animateRect = mod.animateRect;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('calls onFrame with interpolated rects', async () => {
        const from: Rect = { x: 0, y: 0, width: 10, height: 10 };
        const to: Rect = { x: 100, y: 100, width: 50, height: 50 };
        const frames: Rect[] = [];

        animateRect(from, to, {
            onFrame: (rect) => frames.push(rect)
        });

        await advanceSpring(100);
        
        expect(frames.length).toBeGreaterThan(0);
        const midFrame = frames[frames.length - 1];
        expect(midFrame.x).toBeGreaterThan(0);
        expect(midFrame.x).toBeLessThan(100);
    });

    it('calls onComplete when all 4 springs settle', async () => {
        const from: Rect = { x: 0, y: 0, width: 10, height: 10 };
        const to: Rect = { x: 10, y: 10, width: 20, height: 20 };
        
        let completed = false;
        animateRect(from, to, {
            onFrame: () => {},
            onComplete: () => { completed = true; }
        });

        await advanceSpring(5000);
        expect(completed).toBe(true);
    });

    it('the returned cancel function stops further onFrame calls', async () => {
        const from: Rect = { x: 0, y: 0, width: 10, height: 10 };
        const to: Rect = { x: 100, y: 100, width: 50, height: 50 };
        const frames: Rect[] = [];

        const cancel = animateRect(from, to, {
            onFrame: (rect) => frames.push(rect)
        });

        await advanceSpring(64);
        const framesSoFar = frames.length;

        cancel();

        await advanceSpring(5000);
        expect(frames.length).toBe(framesSoFar);
    });
});

describe('Widget.layoutTransition', () => {
    let Widget: typeof import('@termuijs/widgets').Widget;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.unstubAllEnvs();
        vi.stubEnv('NO_MOTION', '');
        vi.stubEnv('CI', '');
        vi.resetModules();
        
        const widgetsMod = await import('@termuijs/widgets');
        Widget = widgetsMod.Widget;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('Widget.layoutTransition = true causes updateRect to animate rather than snap', async () => {
        class TestWidget extends Widget {
            protected _renderSelf(): void {}
        }
        
        const widget = new TestWidget({ id: 'test' });
        
        widget.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        expect(widget.rect).toEqual({ x: 0, y: 0, width: 10, height: 10 });

        widget.layoutTransition = true;
        
        widget.updateRect({ x: 100, y: 100, width: 100, height: 100 });
        
        await advanceSpring(64);
        
        const rect = widget.rect;
        expect(rect.x).toBeGreaterThan(0);
        expect(rect.x).toBeLessThan(100);
        expect(rect.width).toBeGreaterThan(10);
        expect(rect.width).toBeLessThan(100);
        
        await advanceSpring(5000);
        expect(widget.rect).toEqual({ x: 100, y: 100, width: 100, height: 100 });
    });
});
