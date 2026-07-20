import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kbd } from './Kbd.js';
import { caps } from '@termuijs/core';

// A lightweight mock to capture screen writes without angering TypeScript
class MockScreen {
    public grid: Record<string, string> = {};

    setCell(x: number, y: number, cell: { char: string }) {
        this.grid[`${x},${y}`] = cell.char;
    }

    writeString(x: number, y: number, text: string) {
        for (let i = 0; i < text.length; i++) {
            this.grid[`${x + i},${y}`] = text[i];
        }
    }

    getCell(x: number, y: number) {
        return { char: this.grid[`${x},${y}`] || ' ' };
    }
}

describe('Kbd Widget', () => {
    let screen: MockScreen;
    let originalUnicode: boolean;

    beforeEach(() => {
        screen = new MockScreen();
        originalUnicode = caps.unicode;
    });

    afterEach(() => {
        // Force reset ignoring readonly checks
        (caps as any).unicode = originalUnicode; 
    });

    it('renders a single key', () => {
        (caps as any).unicode = true;
        const kbd = new Kbd('Enter');
        
        (kbd as any)._rect = { x: 0, y: 0, width: 20, height: 1 };
        (kbd as any)._renderSelf(screen as any);

        expect(screen.getCell(0, 0).char).toBe('⟨');
        expect(screen.getCell(1, 0).char).toBe(' ');
        expect(screen.getCell(2, 0).char).toBe('E');
        expect(screen.getCell(8, 0).char).toBe('⟩');
    });

    it('renders a combo split on + into multiple caps', () => {
        (caps as any).unicode = true;
        const kbd = new Kbd('Ctrl+C');
        
        (kbd as any)._rect = { x: 0, y: 0, width: 30, height: 1 };
        (kbd as any)._renderSelf(screen as any);

        // First cap: ⟨ Ctrl ⟩
        expect(screen.getCell(0, 0).char).toBe('⟨');
        expect(screen.getCell(2, 0).char).toBe('C');
        expect(screen.getCell(7, 0).char).toBe('⟩');

        // Separator:  + 
        expect(screen.getCell(8, 0).char).toBe(' ');
        expect(screen.getCell(9, 0).char).toBe('+');
        expect(screen.getCell(10, 0).char).toBe(' ');

        // Second cap: ⟨ C ⟩
        expect(screen.getCell(11, 0).char).toBe('⟨');
        expect(screen.getCell(13, 0).char).toBe('C');
        expect(screen.getCell(15, 0).char).toBe('⟩');
    });

    it('setKeys() updates the rendered output', () => {
        (caps as any).unicode = true;
        const kbd = new Kbd('A');
        
        (kbd as any)._rect = { x: 0, y: 0, width: 10, height: 1 };
        (kbd as any)._renderSelf(screen as any);
        expect(screen.getCell(2, 0).char).toBe('A');

        kbd.setKeys('B');
        (kbd as any)._renderSelf(screen as any);
        expect(screen.getCell(2, 0).char).toBe('B');
    });

    it('ASCII fallback when caps.unicode is false', () => {
        (caps as any).unicode = false;
        const kbd = new Kbd('Alt');
        
        (kbd as any)._rect = { x: 0, y: 0, width: 10, height: 1 };
        (kbd as any)._renderSelf(screen as any);

        expect(screen.getCell(0, 0).char).toBe('[');
        expect(screen.getCell(6, 0).char).toBe(']');
    });

    it('does not mark dirty when setKeys receives the same value', () => {
        const kbd = new Kbd('Ctrl+C');
    
        kbd.clearDirty();
    
        kbd.setKeys('Ctrl+C');
    
        expect(kbd.isDirty).toBe(false);
    });
    
    it('marks dirty when setKeys receives a different value', () => {
        const kbd = new Kbd('Ctrl+C');
    
        kbd.clearDirty();
    
        kbd.setKeys('Ctrl+V');
    
        expect(kbd.isDirty).toBe(true);
    });

});