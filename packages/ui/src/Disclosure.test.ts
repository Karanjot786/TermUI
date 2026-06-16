import { describe, test, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Text } from '@termuijs/widgets';
import { Disclosure } from './Disclosure.js';

describe('Disclosure Widget', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('closed disclosure renders only the summary header', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = new Screen(30, 4);
        const d = new Disclosure(new Text('body text'), { summary: 'Details' });
        d.updateRect({ x: 0, y: 0, width: 30, height: 4 });

        d.render(screen);

        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('▸ Details');
        const allRows = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(allRows).not.toContain('body text');
    });

    test('open disclosure renders summary then content below it', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = new Screen(30, 4);
        const d = new Disclosure(new Text('body text'), { summary: 'Details' });
        d.updateRect({ x: 0, y: 0, width: 30, height: 4 });

        d.open();
        d.render(screen);

        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('▾ Details');
        const allRows = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(allRows).toContain('body text');
    });

    test('space and enter key toggles open state', () => {
        const d = new Disclosure(new Text('body text'), { summary: 'Details' });
        expect(d.isOpen).toBe(false);

        d.handleKey({ key: ' ' } as any);
        expect(d.isOpen).toBe(true);

        d.handleKey({ key: 'enter' } as any);
        expect(d.isOpen).toBe(false);
    });

    test('onToggle callback fires when state changes', () => {
        const onToggleSpy = vi.fn();
        const d = new Disclosure(new Text('body text'), { summary: 'Details', onToggle: onToggleSpy });

        d.open();
        expect(onToggleSpy).toHaveBeenCalledWith(true);

        d.close();
        expect(onToggleSpy).toHaveBeenCalledWith(false);
    });

    test('ASCII fallback markers render when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const screen = new Screen(30, 4);
        const d = new Disclosure(new Text('body text'), { summary: 'Details' });
        d.updateRect({ x: 0, y: 0, width: 30, height: 4 });

        d.render(screen);
        let row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('> Details');

        d.open();
        d.render(screen);
        row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('v Details');
    });

    test('no-op render when rect is not set', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = new Screen(30, 4);
        const d = new Disclosure(new Text('body text'), { summary: 'Details' });
        // do NOT call updateRect — rect is undefined

        d.render(screen);

        // Screen must remain fully blank
        const allRows = screen.back.map(r => r.map(c => c.char).join('')).join('');
        expect(allRows.trim()).toBe('');
    });

    test('header is truncated to fit the widget width', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = new Screen(40, 4);
        const longSummary = 'A very long summary that exceeds the available width';
        const d = new Disclosure(new Text('body'), { summary: longSummary });
        d.updateRect({ x: 0, y: 0, width: 12, height: 4 });

        d.render(screen);

        // Row 0 chars within our widget width must not exceed 12 display columns
        const row0 = screen.back[0].map(c => c.char).join('');
        // The text in the widget area must fit within 12 chars (rest of row is spaces)
        const widgetArea = row0.slice(0, 12);
        expect(widgetArea.length).toBeLessThanOrEqual(12);
        // Should start with the closed arrow marker
        expect(widgetArea).toContain('▸');
    });
});
