// ─────────────────────────────────────────────────────
// @termuijs/tss — Tests for Tokenizer
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { tokenize, TokenType } from './tokenizer.js';

describe('TSS Tokenizer', () => {
    it('tokenizes @theme keyword', () => {
        const tokens = tokenize('@theme dark {}');
        expect(tokens[0].type).toBe(TokenType.AtTheme);
        expect(tokens[0].value).toBe('@theme');
    });

    it('tokenizes identifiers', () => {
        const tokens = tokenize('Box { }');
        expect(tokens[0].type).toBe(TokenType.Ident);
        expect(tokens[0].value).toBe('Box');
    });

    it('tokenizes colors (#hex)', () => {
        const tokens = tokenize('color: #ff00ff;');
        const color = tokens.find(t => t.type === TokenType.Color);
        expect(color).toBeDefined();
        expect(color!.value).toBe('#ff00ff');
    });

    it('tokenizes strings', () => {
        const tokens = tokenize('content: "hello";');
        const str = tokens.find(t => t.type === TokenType.String);
        expect(str).toBeDefined();
        expect(str!.value).toBe('hello');
    });

    it('tokenizes numbers', () => {
        const tokens = tokenize('width: 42;');
        const num = tokens.find(t => t.type === TokenType.Number);
        expect(num).toBeDefined();
        expect(num!.value).toBe('42');
    });

    it('tokenizes CSS variables --name', () => {
        const tokens = tokenize('--primary: cyan;');
        const variable = tokens.find(t => t.type === TokenType.Variable);
        expect(variable).toBeDefined();
        expect(variable!.value).toBe('--primary');
    });

    it('tokenizes var() references', () => {
        const tokens = tokenize('color: var(--primary);');
        const v = tokens.find(t => t.type === TokenType.Var);
        expect(v).toBeDefined();
        expect(v!.value).toBe('--primary');
    });

    it('tokenizes calc() expressions as a single value', () => {
        const tokens = tokenize('width: calc(10 - 2);');
        const calc = tokens.find(t => t.type === TokenType.Calc);
        expect(calc).toBeDefined();
        expect(calc!.value).toBe('calc(10 - 2)');
    });

    it('tokenizes pseudo-classes', () => {
        const tokens = tokenize('Box:focused { }');
        const pseudo = tokens.find(t => t.type === TokenType.PseudoClass);
        expect(pseudo).toBeDefined();
        expect(pseudo!.value).toBe('focused');
    });

    it('filters out comments', () => {
        const tokens = tokenize('/* comment */ Box {}');
        const comments = tokens.filter(t => t.type === TokenType.Comment);
        expect(comments).toHaveLength(0);
    });

    it('ends with EOF token', () => {
        const tokens = tokenize('');
        expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });
});
