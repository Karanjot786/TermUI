import { describe, expect, it } from 'vitest';
import { Spacer } from './Spacer.js';
import { Screen } from '@termuijs/core';

describe('Spacer', () => {
    it('initialises with flexGrow', () => {
        const spacer = new Spacer(2);
        expect(spacer.style.flexGrow).toBe(2);
    });

    it('renders empty space without errors', () => {
        const spacer = new Spacer();
        const screen = new Screen(10, 10);
        spacer.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        spacer.render(screen);
        
        // Ensure no characters were written
        const row = screen.back[0].map(c => c.char).join('');
        expect(row.trim()).toBe('');
    });
});
