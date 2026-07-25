import { describe, it, expect, beforeEach } from 'vitest';
import { Screen, App } from '@termuijs/core';
import { Widget } from '@termuijs/widgets';
import { TooltipOverlay } from './TooltipOverlay.js';

class MockRoot extends Widget {
    protected _renderSelf(screen: Screen): void {
        // no-op
    }
}

describe('TooltipOverlay', () => {
    let app: App;
    let tooltip: TooltipOverlay;

    beforeEach(() => {
        app = new App(new MockRoot());
        tooltip = new TooltipOverlay({ app });
    });

    it('should initially be hidden', () => {
        const screen = new Screen(20, 10);
        tooltip.render(screen);
        const row = screen.back[0].map(c => c.char).join('').trim();
        expect(row).toBe(''); // Nothing rendered
    });

    it('should show tooltip when state changes', () => {
        const screen = new Screen(20, 10);
        app.tooltip.open('Test tip', 2, 2);

        tooltip.render(screen);
        
        // At y=2, x=2, we should see "Test tip"
        const row = screen.back[2].map(c => c.char).join('').trim();
        expect(row).toContain('Test tip');
    });

    it('should adjust position if it overflows the screen', () => {
        app.screen.resize(20, 10);

        // Open tooltip near the right edge
        app.tooltip.open('Very long tooltip', 15, 2);

        const renderScreen = new Screen(20, 10);
        tooltip.render(renderScreen);
        
        // It should shift left to avoid overflow
        // length is 17. 20 - 17 = 3. x should be 3 instead of 15.
        const row = renderScreen.back[2].map(c => c.char).join('');
        expect(row).toContain('   Very long tooltip');
    });

    it('should properly measure unicode graphemes', () => {
        app.screen.resize(20, 10);
        // An emoji is 2 cells wide typically in standard terminals
        app.tooltip.open('🌍', 19, 2);

        const renderScreen = new Screen(20, 10);
        tooltip.render(renderScreen);
        
        const row = renderScreen.back[2].map(c => c.char).join('');
        // Width of earth emoji might be 2. So it should shift to x=18.
        expect(row).toContain('🌍');
    });

    it('should close tooltip when state is null', () => {
        const screen = new Screen(20, 10);
        app.tooltip.open('Test tip', 2, 2);
        app.tooltip.close();

        tooltip.render(screen);
        const row = screen.back[2].map(c => c.char).join('').trim();
        expect(row).toBe('');
    });
});
