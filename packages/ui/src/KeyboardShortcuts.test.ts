import { describe, expect, it } from 'vitest';
import { KeyboardShortcuts } from './KeyboardShortcuts.js';
import { Screen } from '@termuijs/core';

describe('KeyboardShortcuts', () => {
    it('renders shortcuts grouped by category', () => {
        const widget = new KeyboardShortcuts([
            { key: 'Ctrl+S', description: 'Save', category: 'File' },
            { key: 'Ctrl+Q', description: 'Quit', category: 'File' }
        ]);
        const screen = new Screen(40, 10);
        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);

        const rows = screen.back.map(r => r.map(c => c.char).join(''));
        expect(rows.join('\n')).toContain('FILE');
        expect(rows.join('\n')).toContain('[Ctrl+S]');
        expect(rows.join('\n')).toContain('Save');
    });

    it('setBindings updates the list', () => {
        const widget = new KeyboardShortcuts([]);
        const screen = new Screen(40, 10);
        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);
        
        expect(screen.back[0].map(c => c.char).join('').trim()).toBe('');

        widget.setBindings([{ key: 'A', description: 'B' }]);
        widget.render(screen);
        expect(screen.back[0].map(c => c.char).join('')).toContain('[A]');
    });
});
