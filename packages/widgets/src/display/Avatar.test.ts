// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Avatar widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Avatar', () => {
    it('initializes and extracts initials correctly', async () => {
        const { Avatar } = await import('./Avatar.js');
        const a1 = new Avatar('John Doe');
        expect(a1.getName()).toBe('John Doe');
        // We can check render output to verify initials
        const { Screen } = await import('@termuijs/core');
        a1.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        a1.render(screen);
        
        const rendered = screen.back[0].map(c => c.char).join('').trim();
        expect(rendered).toContain('[JD]');
    });

    it('setName updates name and initials', async () => {
        const { Avatar } = await import('./Avatar.js');
        const a = new Avatar('Alice');
        a.setName('Bob Smith');
        expect(a.getName()).toBe('Bob Smith');
        
        const { Screen } = await import('@termuijs/core');
        a.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        a.render(screen);
        
        const rendered = screen.back[0].map(c => c.char).join('').trim();
        expect(rendered).toContain('[BS]');
    });

    it('shape rendering matches square/circle format', async () => {
        const { Avatar } = await import('./Avatar.js');
        const { Screen } = await import('@termuijs/core');
        
        const a = new Avatar('Charlie', {}, { shape: 'circle' });
        a.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        a.render(screen);
        
        let rendered = screen.back[0].map(c => c.char).join('').trim();
        expect(rendered).toContain('(CH)');
        expect(a.getShape()).toBe('circle');

        a.setShape('square');
        a.render(screen);
        rendered = screen.back[0].map(c => c.char).join('').trim();
        expect(rendered).toContain('[CH]');
        expect(a.getShape()).toBe('square');
    });

    it('deterministic color generation for identical names', async () => {
        const { Avatar } = await import('./Avatar.js');
        const { Screen } = await import('@termuijs/core');
        
        const a1 = new Avatar('Eve');
        const a2 = new Avatar('Eve');
        
        a1.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        a2.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        
        const screen1 = new Screen(10, 1);
        const screen2 = new Screen(10, 1);
        
        a1.render(screen1);
        a2.render(screen2);
        
        // Find the fg color of the first non-empty cell
        const cell1 = screen1.back[0].find(c => c.char !== ' ' && c.char !== '');
        const cell2 = screen2.back[0].find(c => c.char !== ' ' && c.char !== '');
        
        expect(cell1?.fg).toEqual(cell2?.fg);
    });

    it('explicit color override is respected', async () => {
        const { Avatar } = await import('./Avatar.js');
        const { Screen } = await import('@termuijs/core');
        
        const a = new Avatar('Frank', {}, { color: { type: 'named', name: 'red' } });
        a.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        a.render(screen);
        
        const cell = screen.back[0].find(c => c.char !== ' ' && c.char !== '');
        expect(cell?.fg).toEqual({ type: 'named', name: 'red' });
        
        a.setColor({ type: 'named', name: 'blue' });
        a.render(screen);
        const cellBlue = screen.back[0].find(c => c.char !== ' ' && c.char !== '');
        expect(cellBlue?.fg).toEqual({ type: 'named', name: 'blue' });
        expect(a.getColor()).toEqual({ type: 'named', name: 'blue' });
    });

    it('handles empty strings gracefully', async () => {
        const { Avatar } = await import('./Avatar.js');
        const { Screen } = await import('@termuijs/core');
        
        const a = new Avatar('');
        a.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        expect(() => a.render(screen)).not.toThrow();
        
        const rendered = screen.back[0].map(c => c.char).join('').trim();
        expect(rendered).toBe('[]');
    });
});
