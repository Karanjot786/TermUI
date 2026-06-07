import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Screen, caps, parseColor } from '@termuijs/core';
import { Link } from './Link.js';

describe('Link Widget', () => {
    let screen: Screen;

    beforeEach(() => {
        screen = new Screen(60, 5);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders the display text and sets native cell link attributes correctly', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const link = new Link(
            'Click Here', 
            { bold: true }, 
            { url: 'https://example.com', color: parseColor('blue') }
        );
        
        link.updateRect({ x: 0, y: 0, width: 60, height: 1 });
        link.render(screen);

        // Verify plain characters map cleanly to screen columns without truncation corruption
        const plainChars = screen.back[0].slice(0, 10).map(c => c.char).join('');
        expect(plainChars).toBe('Click Here');

        // Verify each visual character cell holds the metadata link parameter
        for (let i = 0; i < 10; i++) {
            expect(screen.back[0][i].link).toBe('https://example.com');
        }
    });

    it('setText and setUrl triggers markDirty and updates link properties', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const link = new Link('Old Text', {}, { url: 'https://old.com' });
        const markDirtySpy = vi.spyOn(link, 'markDirty');

        link.setText('New Text');
        expect(markDirtySpy).toHaveBeenCalledTimes(1);

        link.setUrl('https://new.com');
        expect(markDirtySpy).toHaveBeenCalledTimes(2);

        link.updateRect({ x: 0, y: 0, width: 60, height: 1 });
        link.render(screen);

        const plainChars = screen.back[0].slice(0, 8).map(c => c.char).join('');
        expect(plainChars).toBe('New Text');
        expect(screen.back[0][0].link).toBe('https://new.com');
    });

    it('appends URL in parentheses when caps.unicode is false and showUrlFallback is true', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const link = new Link('Docs', {}, { url: 'https://docs.com', showUrlFallback: true });
        link.updateRect({ x: 0, y: 0, width: 60, height: 1 });
        link.render(screen);

        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('Docs (https://docs.com)');
        // Link cell property must be undefined under standard fallback layout
        expect(screen.back[0][0].link).toBeUndefined();
    });

    it('does not append URL fallback if showUrlFallback option is configured to false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const link = new Link('Docs', {}, { url: 'https://docs.com', showUrlFallback: false });
        link.updateRect({ x: 0, y: 0, width: 60, height: 1 });
        link.render(screen);

        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('Docs');
        expect(row0).not.toContain('(https://docs.com)');
    });
});
