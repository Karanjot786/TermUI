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
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
        const screen = new Screen(20, 1);
        const ld = new LoadingDots({}, { label: 'Thinking', maxDots: 3 });
        ld.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        ld.tick();
        ld.render(screen);
        const row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('Thinking·  ');
    });

    it('the dot count cycles back to zero after maxDots', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
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

    it('tick marks widget dirty', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
        const ld = new LoadingDots({}, { label: 'Loading' });

        ld.clearDirty();
        ld.tick();

        expect(ld.isDirty).toBe(true);
    });

    it('setLabel marks widget dirty', () => {
        const ld = new LoadingDots({}, { label: 'Loading' });

        ld.clearDirty();
        ld.setLabel('Done');

        expect(ld.isDirty).toBe(true);
    });

    it('tick updates rendered output after mutation', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
        const screen = new Screen(20, 1);
        const ld = new LoadingDots({}, { label: 'Loading', maxDots: 3 });

        ld.updateRect({ x: 0, y: 0, width: 20, height: 1 });

        ld.tick();
        ld.render(screen);

        const row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('Loading·');
    });

    it('ASCII fallback dot renders when caps.unicode is false', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const screen = new Screen(20, 1);
        const ld = new LoadingDots({}, { label: 'Thinking', maxDots: 3 });
        ld.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        ld.tick();
        ld.render(screen);
        const row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('Thinking.  ');
    });

    it('does not mark dirty when label is unchanged', () => {
        const ld = new LoadingDots({}, { label: 'Loading' });
    
        ld.clearDirty();
        ld.setLabel('Loading');
    
        expect(ld.isDirty).toBe(false);
    });
    
    it('does not animate when reduced motion is preferred', () => {
        vi.spyOn(caps, 'motion', 'get').mockReturnValue(false);
    
        const ld = new LoadingDots({}, {
            label: 'Loading',
            maxDots: 3,
        });
    
        ld.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 1,
        });
    
        const screen1 = new Screen(20, 1);
        ld.render(screen1);
    
        const first = screen1.back[0]
            .map(c => c.char)
            .join('');
    
        ld.tick();
    
        const screen2 = new Screen(20, 1);
        ld.render(screen2);
    
        const second = screen2.back[0]
            .map(c => c.char)
            .join('');
    
        expect(second).toBe(first);
    });

});
