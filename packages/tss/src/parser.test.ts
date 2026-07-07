// ─────────────────────────────────────────────────────
// @termuijs/tss — Tests for Parser
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';

function parseTSS(source: string) {
    return parse(tokenize(source));
}

describe('TSS Parser', () => {
    it('parses a theme declaration', () => {
        const ast = parseTSS(`
            @theme dark {
                --primary: cyan;
                --bg: #1a1a2e;
            }
        `);
        expect(ast.themes).toHaveLength(1);
        expect(ast.themes[0].name).toBe('dark');
        expect(ast.themes[0].variables['--primary']).toBe('cyan');
        expect(ast.themes[0].variables['--bg']).toBe('#1a1a2e');
    });

    it('parses a simple rule', () => {
        const ast = parseTSS(`
            Box {
                bold: true;
                border: single;
            }
        `);
        expect(ast.rules).toHaveLength(1);
        expect(ast.rules[0].selector.widget).toBe('Box');
        expect(ast.rules[0].properties).toHaveLength(2);
    });

    it('parses class selectors', () => {
        const ast = parseTSS(`
            Box.dashboard {
                border: round;
            }
        `);
        expect(ast.rules[0].selector.widget).toBe('Box');
        expect(ast.rules[0].selector.className).toBe('dashboard');
    });

    it('parses pseudo-class selectors', () => {
        const ast = parseTSS(`
            Box:focused {
                border-color: cyan;
            }
        `);
        expect(ast.rules[0].selector.pseudo).toBe('focused');
    });

    it('parses var() references', () => {
        const ast = parseTSS(`
            Gauge {
                color: var(--primary);
            }
        `);
        const prop = ast.rules[0].properties[0];
        expect(prop.value.kind).toBe('var');
    });

    it('parses numeric values', () => {
        const ast = parseTSS(`
            Box {
                width: 50;
            }
        `);
        const prop = ast.rules[0].properties[0];
        expect(prop.value.kind).toBe('number');
        expect((prop.value as any).value).toBe(50);
    });

    it('preserves multi-token spacing values', () => {
        const ast = parseTSS(`
            Box {
                padding: 1 2;
                margin: 1 2 3 4;
            }
        `);

        expect(ast.rules[0].properties[0].value).toEqual({
            kind: 'literal',
            value: '1 2',
        });
        expect(ast.rules[0].properties[1].value).toEqual({
            kind: 'literal',
            value: '1 2 3 4',
        });
    });

    it('parses calc expressions as literal values', () => {
        const ast = parseTSS(`
            Box {
                width: calc(10 - 2);
            }
        `);
        const prop = ast.rules[0].properties[0];
        expect(prop.value).toEqual({ kind: 'literal', value: 'calc(10 - 2)' });
    });
});
