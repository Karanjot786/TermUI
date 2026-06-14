import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { Announcer, announcer } from './Announcer.js';

describe('Announcer', () => {
    afterEach(() => {
        announcer.clear();
        vi.restoreAllMocks();
    });

    it('announce sets current text', () => {
        const a = new Announcer();
        a.announce('Saved');
        expect(a.current).toBe('Saved');
    });

    it('assertive overrides pending polite', () => {
        const a = new Announcer();
        a.announce('Polite message 1', 'polite');
        a.announce('Polite message 2', 'polite');
        a.announce('Assertive message', 'assertive');
        
        expect(a.current).toBe('Assertive message');

        const screen = new Screen(40, 5);
        a.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        a.render(screen);

        const rendered = screen.back.map(row => row.map(c => c.char).join('').trim()).filter(Boolean);
        expect(rendered).toEqual(['Assertive message']);
    });

    it('clear empties the region', () => {
        const a = new Announcer();
        a.announce('Saved');
        expect(a.current).toBe('Saved');
        a.clear();
        expect(a.current).toBe('');
    });

    it('render writes the message into the back buffer', () => {
        const screen = new Screen(40, 1);
        const a = new Announcer();
        a.announce('Saved');
        a.updateRect({ x: 0, y: 0, width: 40, height: 1 });
        a.render(screen);
        const row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('Saved');
    });

    it('long text is truncated to the rect width', () => {
        const screen = new Screen(10, 2);
        const a = new Announcer();
        a.announce('This is a very long announcement that exceeds the screen width');
        a.updateRect({ x: 0, y: 0, width: 10, height: 2 });
        a.render(screen);

        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toBe('This is a…');
    });

    it('should use the shared singleton announcer correctly', () => {
        expect(announcer).toBeInstanceOf(Announcer);
        announcer.clear();
        announcer.announce('Singleton Hello');
        expect(announcer.current).toBe('Singleton Hello');
    });

    it('rejects non-positive history option', () => {
        expect(() => new Announcer({ history: 0 })).toThrow(RangeError);
        expect(() => new Announcer({ history: -1 })).toThrow(RangeError);
        expect(() => new Announcer({ history: 1.5 })).toThrow(RangeError);
    });
});
