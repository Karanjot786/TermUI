import { describe, expect, it, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { Fill } from './Fill.js';

describe('Fill widget', () => {
    it('all cells in a 10x5 widget contain the fill character', () => {
        const fill = new Fill({}, { char: '#' });

        fill.updateRect({ x: 0, y: 0, width: 10, height: 5 });

        const screen = new Screen(10, 5);
        fill.render(screen);

        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 10; x++) {
                expect(screen.back[y][x].char).toBe('#');
            }
        }
    });

    it('setChar updates the fill character', () => {
        const fill = new Fill({}, { char: '#' });

        fill.setChar('*');

        fill.updateRect({ x: 0, y: 0, width: 10, height: 5 });

        const screen = new Screen(10, 5);
        fill.render(screen);

        expect(screen.back[0][0].char).toBe('*');
    });

    it('setChar triggers markDirty', () => {
        const fill = new Fill();

        const spy = vi.spyOn(fill, 'markDirty');

        fill.setChar('*');

        expect(spy).toHaveBeenCalled();
    });
});