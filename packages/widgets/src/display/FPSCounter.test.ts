import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { FPSCounter } from './FPSCounter.js';

function row(screen: Screen, y: number): string {
    return screen.back[y].map(c => c.char).join('');
}

describe('FPSCounter', () => {
    it('stores latest fps value', () => {
        const fps = new FPSCounter();

        fps.updateFPS(60);

        expect(fps.getFPS()).toBe(60);
    });

    it('marks dirty when fps changes', () => {
        const fps = new FPSCounter();

        fps.clearDirty();

        fps.updateFPS(60);

        expect(fps.isDirty).toBe(true);
    });

    it('calculates average fps', () => {
        const fps = new FPSCounter();

        fps.updateFPS(60);
        fps.updateFPS(30);

        expect(fps.getAverageFPS()).toBe(45);
    });

    it('renders fps information', () => {
        const fps = new FPSCounter();

        fps.updateFPS(60);

        fps.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 5,
        });

        const screen = new Screen(20, 5);

        fps.render(screen);

        expect(row(screen, 0)).toContain('FPS: 60');
    });

    it('renders average fps', () => {
        const fps = new FPSCounter();

        fps.updateFPS(60);
        fps.updateFPS(30);

        fps.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 5,
        });

        const screen = new Screen(20, 5);

        fps.render(screen);

        expect(row(screen, 1)).toContain('Avg: 45.0');
    });

    it('tracks min and max fps', () => {
        const fps = new FPSCounter();
    
        fps.updateFPS(60);
        fps.updateFPS(30);
        fps.updateFPS(90);
    
        fps.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 5,
        });
    
        const screen = new Screen(20, 5);
    
        fps.render(screen);
    
        expect(row(screen, 2)).toContain('Min: 30');
        expect(row(screen, 3)).toContain('Max: 90');
    });
    
    it('ignores negative fps values', () => {
        const fps = new FPSCounter();
    
        fps.updateFPS(-10);
    
        expect(fps.getFPS()).toBe(0);
    });

});