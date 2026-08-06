import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Screen, caps, stringWidth } from '@termuijs/core';
import { Text } from '@termuijs/widgets';
import { Popover } from './Popover.js';

describe('Popover Widget', () => {
    let screen: Screen;

    beforeEach(() => {
        // The issue explicitly requested a 30x10 screen for tests
        screen = new Screen(30, 10);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Helper to extract the screen buffer into a readable string
    const getScreenText = () => screen.back.map(r => r.map(c => c.char || ' ').join('')).join('\n');

    it('renders nothing when closed', () => {
        const pop = new Popover(new Text('hi there'));
        pop.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        
        pop.render(screen);
        const rows = getScreenText();
        
        expect(rows).not.toContain('hi there');
        expect(rows).not.toContain('┌');
    });

    it('renders a bordered panel and wrapped content when open', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const pop = new Popover(new Text('hi there'), {}, { title: 'Info' });
        pop.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        
        pop.open();
        pop.render(screen);
        const rows = getScreenText();
        
        // Check for content
        expect(rows).toContain('hi there');
        // Check for title
        expect(rows).toContain('Info');
        // Check for unicode borders
        expect(rows).toContain('┌');
        expect(rows).toContain('─');
    });

    it('closes the panel when escape is pressed', () => {
        const pop = new Popover(new Text('hi there'));
        pop.open();
        expect(pop.isOpen).toBe(true);

        // Simulate Escape key
        pop.handleKey({ key: 'escape', ctrl: false, shift: false } as any);
        
        expect(pop.isOpen).toBe(false);
    });

    it('renders ASCII fallback border when caps.unicode is false', () => {
        // Spy on the global 'caps' object to fake a basic terminal
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const pop = new Popover(new Text('hi there'), {}, { title: 'Info' });
        pop.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        
        pop.open();
        pop.render(screen);
        const rows = getScreenText();

        // Should NOT contain unicode borders
        expect(rows).not.toContain('┌');
        expect(rows).not.toContain('─');
        
        // Should contain ASCII fallbacks
        expect(rows).toContain('+');
        expect(rows).toContain('-');
        expect(rows).toContain('|');
    });

    it('positions the panel relative to an explicit anchor coordinate', () => {
        // Set an explicit anchor at X:10, Y:2
        const pop = new Popover(
            new Text('anchored text'), 
            {}, 
            { anchor: { x: 10, y: 2 }, placement: 'bottom' }
        );
        
        // Give the popover plenty of room to render
        pop.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        
        pop.open();
        pop.render(screen);
        const rows = getScreenText();
        
        // The text should still successfully render on the screen
        expect(rows).toContain('anchored');
    });

    it('clamps bottom placement when the anchor is near the bottom-right edge', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const pop = new Popover(
            new Text('edge text'),
            {},
            { anchor: { x: 29, y: 9 }, placement: 'bottom' }
        );

        pop.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        pop.open();
        pop.render(screen);

        const rows = getScreenText();
        expect(rows).toContain('edge');
        expect(rows.split('\n')[9]).toContain('+');
    });

    it('clamps top placement when the anchor is above the available panel height', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const pop = new Popover(
            new Text('top edge'),
            {},
            { anchor: { x: 2, y: 0 }, placement: 'top' }
        );

        pop.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        pop.open();
        pop.render(screen);

        const rows = getScreenText();
        expect(rows).toContain('top edge');
        expect(rows.split('\n')[0]).toContain('+');
    });

    it('clips long titles to the popover border width', () => {
        const pop = new Popover(new Text('x'), {}, {
            title: 'A very long title that should not widen the border',
        });
        const writeSpy = vi.spyOn(screen, 'writeString');

        pop.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        pop.open();
        pop.render(screen);

        const topBorderWrite = writeSpy.mock.calls.find(call => call[1] === 1);
        expect(topBorderWrite).toBeDefined();
        expect(stringWidth(String(topBorderWrite?.[2]))).toBe(10);
    });
});
