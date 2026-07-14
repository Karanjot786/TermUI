import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { TypingIndicator } from './TypingIndicator.js';

describe('TypingIndicator', () => {
    let screen: Screen;



    beforeEach(() => {
        screen = new Screen(20, 5);
        vi.useFakeTimers();
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('renders empty when stopped', () => {
        const indicator = new TypingIndicator();
        indicator.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        indicator.render(screen);

        const row = screen.back[0].map(c => c.char).join('').slice(0, 10);
        expect(row).toBe('          '); // Empty
    });

    it('animates frames when started', () => {
        const indicator = new TypingIndicator({}, { speedMs: 100 });
        indicator.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        
        indicator.start();
        expect(indicator.isRunning()).toBe(true);
        indicator.render(screen);

        let row = screen.back[0].map(c => c.char).join('').trim();
        expect(row).toBe(''); // Initial frame is empty

        // Advance 100ms
        vi.advanceTimersToNextTimer();
        indicator.render(screen);
        row = screen.back[0].map(c => c.char).join('').trim();
        expect(row).toBe('.');

        // Advance 100ms
        vi.advanceTimersToNextTimer();
        indicator.render(screen);
        row = screen.back[0].map(c => c.char).join('').trim();
        expect(row).toBe('..');

        // Advance 100ms
        vi.advanceTimersToNextTimer();
        indicator.render(screen);
        row = screen.back[0].map(c => c.char).join('').trim();
        expect(row).toBe('...');

        // Stop it
        indicator.stop();
        expect(indicator.isRunning()).toBe(false);
        indicator.render(screen);
        row = screen.back[0].map(c => c.char).join('').slice(0, 10);
        expect(row).toBe('          '); // Should clear text when stopped
    });

    it('respects caps.motion (reduced motion)', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(false);
        
        const indicator = new TypingIndicator({}, { fallbackText: 'Typing...' });
        indicator.updateRect({ x: 0, y: 0, width: 15, height: 1 });
        
        indicator.start();
        indicator.render(screen);

        let row = screen.back[0].map(c => c.char).join('').trim();
        expect(row).toBe('Typing...');

        // Advancing time should not change anything when motion is disabled
        vi.advanceTimersByTime(500);
        indicator.render(screen);
        row = screen.back[0].map(c => c.char).join('').trim();
        expect(row).toBe('Typing...');
    });

    it('clears interval on unmount', () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        const indicator = new TypingIndicator();
        indicator.start();
        
        indicator.unmount();
        
        expect(clearIntervalSpy).toHaveBeenCalled();
    });
});
