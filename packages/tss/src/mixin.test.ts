// ─────────────────────────────────────────────────────
// @termuijs/tss — Tests for Mixin support
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { tokenize, TokenType } from './tokenizer.js';
import { parse } from './parser.js';
import { ThemeEngine, compileRules } from './engine.js';

describe('TSS Mixins — Tokenizer', () => {
    it('tokenizes @mixin keyword', () => {
        const tokens = tokenize('@mixin bordered {}');
        expect(tokens[0].type).toBe(TokenType.AtMixin);
        expect(tokens[0].value).toBe('@mixin');
    });

    it('tokenizes @include directive', () => {
        const tokens = tokenize('Box { @include bordered; }');
        const inc = tokens.find(t => t.type === TokenType.AtInclude);
        expect(inc).toBeDefined();
        expect(inc!.value).toBe('@include');
    });
});

describe('TSS Mixins — Parser', () => {
    it('stores mixin definition in stylesheet.mixins', () => {
        const tokens = tokenize('@mixin bordered { border: single; padding: 1; }');
        const ast = parse(tokens);
        expect(ast.mixins.has('bordered')).toBe(true);
        expect(ast.mixins.get('bordered')).toHaveLength(2);
    });

    it('stores include references in rule.includes', () => {
        const tokens = tokenize('Box { @include bordered; color: cyan; }');
        const ast = parse(tokens);
        expect(ast.rules[0].includes).toContain('bordered');
    });

    it('handles class-only selector .className', () => {
        const tokens = tokenize('.box { color: red; }');
        const ast = parse(tokens);
        expect(ast.rules[0].selector.widget).toBe('*');
        expect(ast.rules[0].selector.className).toBe('box');
    });
});

describe('TSS Mixins — Engine', () => {
    it('expands mixin properties into the including rule', () => {
        const engine = new ThemeEngine();
        engine.load(`
            @mixin bordered { border: single; padding: 1; }
            Box { @include bordered; color: cyan; }
        `);
        const rule = engine.rules.find(r => r.selector.widget === 'Box');
        expect(rule).toBeDefined();
        expect(rule!.properties['border']).toBe('single');
        expect(rule!.properties['padding']).toBe('1');
        expect(rule!.properties['color']).toBe('cyan');
    });

    it('rule can include more than one mixin', () => {
        const engine = new ThemeEngine();
        engine.load(`
            @mixin bordered { border: single; }
            @mixin padded { padding: 2; }
            Box { @include bordered; @include padded; }
        `);
        const rule = engine.rules.find(r => r.selector.widget === 'Box');
        expect(rule!.properties['border']).toBe('single');
        expect(rule!.properties['padding']).toBe('2');
    });

    it('rule own properties override mixin properties', () => {
        const engine = new ThemeEngine();
        engine.load(`
            @mixin base { border: single; bold: true; }
            Box { @include base; border: double; }
        `);
        const rule = engine.rules.find(r => r.selector.widget === 'Box');
        expect(rule!.properties['border']).toBe('double');
        expect(rule!.properties['bold']).toBe('true');
    });

    it('compile() returns resolved rules with mixins expanded', () => {
        const rules = compileRules(`
            @mixin bordered { border: single; padding: 1; }
            .box { @include bordered; color: red; }
        `);
        const rule = rules.find(r => r.selector.className === 'box');
        expect(rule).toBeDefined();
        expect(rule!.properties['border']).toBe('single');
        expect(rule!.properties['padding']).toBe('1');
        expect(rule!.properties['color']).toBe('red');
    });
});