import { describe, it, expect, vi, afterEach } from 'vitest';
import { Marquee } from './Marquee.js';
import { Screen, caps } from '@termuijs/core';

function renderMarquee(text: string, opts: any = {}, width = 10, height = 1) {
    const mq = new Marquee(text, {}, opts);
    mq.updateRect({ x: 0, y: 0, width, height });
    const screen = new Screen(width, height);
    mq.render(screen);
    return { mq, screen };
}

function getLine(screen: Screen): string {
    return screen.back[0].map((c: { char: string }) => c.char).join('');
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Marquee', () => {
    it('renders text clipped to width on first frame', () => {
        const { screen } = renderMarquee('Hello World', {}, 5, 1);
        const line = getLine(screen).trimEnd();
        expect(line.length).toBeLessThanOrEqual(5);
    });

    it('tick advances the visible window', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    
        const { mq, screen: s1 } = renderMarquee('Hello', {}, 5, 1);
    
        const first = getLine(s1);
    
        mq.tick();
    
        const screen2 = new Screen(5, 1);
        mq.render(screen2);
    
        const second = getLine(screen2);
    
        expect(second).not.toBe(first);
    });
    
    it('left and right directions scroll opposite ways', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    
        const { mq: mqL } = renderMarquee(
            'Hi',
            { direction: 'left' },
            10,
            1,
        );
    
        const { mq: mqR } = renderMarquee(
            'Hi',
            { direction: 'right' },
            10,
            1,
        );
    
        mqL.tick();
        mqR.tick();
    
        const sL = new Screen(10, 1);
        const sR = new Screen(10, 1);
    
        mqL.render(sL);
        mqR.render(sR);
    
        const left = getLine(sL);
        const right = getLine(sR);
    
        expect(left).not.toBe(right);
    });

    it('setText updates rendered output', () => {
        const { mq } = renderMarquee('Old', {}, 10, 1);
        mq.setText('NewText');
        const screen = new Screen(10, 1);
        mq.render(screen);
        const line = getLine(screen);
        expect(line.trimEnd()).toContain('NewText');
    });

    it('text loops continuously without blank edge', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    
        const { mq, screen } = renderMarquee('X', {}, 10, 1);
    
        const first = getLine(screen).replace(/\0/g, '');
    
        for (let i = 0; i < 20; i++) {
            mq.tick();
    
            const s = new Screen(10, 1);
            mq.render(s);
    
            const line = getLine(s).replace(/\0/g, '');
    
            expect(line.length).toBe(10);
            expect(line.trim()).not.toBe('');
        }
    });

        it('setText marks widget dirty', () => {
        const mq = new Marquee('Hello');

        mq.clearDirty();
        mq.setText('World');

        expect(mq.isDirty).toBe(true);
    });

    it('does not mark dirty when text is unchanged', () => {
        const mq = new Marquee('Hello');

        mq.clearDirty();
        mq.setText('Hello');

        expect(mq.isDirty).toBe(false);
    });

    it('does not scroll when reduced motion is preferred', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(false);
    
        const { mq, screen: s1 } = renderMarquee('Hello', {}, 5, 1);
    
        const first = getLine(s1);
    
        mq.tick();
    
        const s2 = new Screen(5, 1);
        mq.render(s2);
    
        const second = getLine(s2);
    
        expect(second).toBe(first);
    });
    
});
