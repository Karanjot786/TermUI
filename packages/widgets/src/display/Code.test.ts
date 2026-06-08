// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Code widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { Code } from './Code.js';

describe('Code', () => {
    it('renders language label in border area', () => {
        const code = new Code('hello', {}, { language: 'typescript' });
        code.updateRect({ x: 0, y: 0, width: 18, height: 4 });
        const screen = new Screen(18, 4);
        code.render(screen);
        expect(screen.back[0][2].char).toBe('[');
        expect(screen.back[0][3].char).toBe('t');
        expect(screen.back[0][13].char).toBe(']');
    });

    it('shows line numbers in gutter', () => {
        const code = new Code('line1\nline2\nline3');
        code.updateRect({ x: 0, y: 0, width: 12, height: 5 });
        const screen = new Screen(12, 5);
        code.render(screen);
        expect(screen.back[1][1].char).toBe('1');
        expect(screen.back[1][1].dim).toBe(true);
        expect(screen.back[1][2].char).toBe('\u2502');
        expect(screen.back[1][2].dim).toBe(true);
        expect(screen.back[2][1].char).toBe('2');
    });

    it('renders code content', () => {
        const code = new Code('hello\nworld');
        code.updateRect({ x: 0, y: 0, width: 12, height: 4 });
        const screen = new Screen(12, 4);
        code.render(screen);
        expect(screen.back[1][4].char).toBe('h');
        expect(screen.back[1][8].char).toBe('o');
        expect(screen.back[2][4].char).toBe('w');
        expect(screen.back[2][8].char).toBe('d');
    });

    it('hides line numbers when showLineNumbers=false', () => {
        const code = new Code('hello', {}, { showLineNumbers: false });
        code.updateRect({ x: 0, y: 0, width: 10, height: 3 });
        const screen = new Screen(10, 3);
        code.render(screen);
        expect(screen.back[1][1].char).toBe('h');
        expect(screen.back[1][2].char).toBe('e');
        expect(screen.back[1][5].char).toBe('o');
    });

    it('setCode updates content', () => {
        const code = new Code('hello', {}, { language: 'ts' });
        code.updateRect({ x: 0, y: 0, width: 10, height: 3 });
        const screen = new Screen(10, 3);
        code.render(screen);
        expect(screen.back[1][4].char).toBe('h');
        code.setCode('world');
        screen.clear();
        code.render(screen);
        expect(screen.back[1][4].char).toBe('w');
        expect(screen.back[1][8].char).toBe('d');
    });
});
