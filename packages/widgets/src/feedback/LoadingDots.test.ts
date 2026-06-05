// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for LoadingDots widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { LoadingDots } from './LoadingDots.js';

describe('LoadingDots', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders the label', () => {
        const screen = new Screen(20, 1);
        const ld = new LoadingDots({}, { label: 'Thinking', maxDots: 3 });
        ld.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        ld.render(screen);
        const row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('Thinking   ');
    });

    it('tick adds a dot', () => {
        const screen = new Screen(20, 1);
        const ld = new LoadingDots({}, { label: 'Thinking', maxDots: 3 });
        ld.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        ld.tick();
        ld.render(screen);
        const row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('Thinking·  ');
    });

    it('the dot count cycles back to zero after maxDots', () => {
        const screen = new Screen(20, 1);
        const ld = new LoadingDots({}, { label: 'Thinking', maxDots: 3 });
        ld.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        
        ld.tick(); // 1
        ld.tick(); // 2
        ld.tick(); // 3
        ld.render(screen);
        let row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('Thinking···');

        ld.tick(); // 0
        ld.render(screen);
        row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('Thinking   ');
    });

    it('setLabel updates the rendered output', () => {
        const screen = new Screen(20, 1);
        const ld = new LoadingDots({}, { label: 'Thinking', maxDots: 3 });
        ld.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        
        ld.setLabel('Done');
        ld.render(screen);
        const row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('Done   ');
    });

    it('ASCII fallback dot renders when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const screen = new Screen(20, 1);
        const ld = new LoadingDots({}, { label: 'Thinking', maxDots: 3 });
        ld.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        ld.tick();
        ld.render(screen);
        const row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('Thinking.  ');
    });
});
