import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Text } from '@termuijs/widgets';
import { Disclosure } from './Disclosure.js';

describe('Disclosure Widget', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    test('closed disclosure renders only the summary', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = new Screen(30, 4);
        const d = new Disclosure(new Text('body text'), { summary: 'Details' });
        d.updateRect({ x: 0, y: 0, width: 30, height: 4 });
        
        d.render(screen);
        
        const rows = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(rows).toContain('▶ Details');
        expect(rows).not.toContain('body text');
    });

    test('open renders the wrapped content below the summary', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = new Screen(30, 4);
        const d = new Disclosure(new Text('body text'), { summary: 'Details' });
        d.updateRect({ x: 0, y: 0, width: 30, height: 4 });
        
        d.open();
        d.render(screen);
        
        const rows = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(rows).toContain('▼ Details');
        expect(rows).toContain('body text');
    });

    test('space toggles the open state', () => {
        const d = new Disclosure(new Text('body text'), { summary: 'Details' });
        expect(d.isOpen).toBe(false);
        
        d.handleKey({ key: ' ' } as any);
        expect(d.isOpen).toBe(true);

        d.handleKey({ key: 'Enter' } as any);
        expect(d.isOpen).toBe(false);
    });

    test('onToggle fires when the state changes', () => {
        const onToggleSpy = vi.fn();
        const d = new Disclosure(new Text('body text'), { summary: 'Details', onToggle: onToggleSpy });
        
        d.open();
        expect(onToggleSpy).toHaveBeenCalledWith(true);

        d.close();
        expect(onToggleSpy).toHaveBeenCalledWith(false);
    });

    test('ASCII fallback marker renders when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const screen = new Screen(30, 4);
        const d = new Disclosure(new Text('body text'), { summary: 'Details' });
        d.updateRect({ x: 0, y: 0, width: 30, height: 4 });
        
        d.render(screen);
        let rows = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(rows).toContain('> Details');

        d.open();
        d.render(screen);
        rows = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
        expect(rows).toContain('v Details');
    });
});