// ─────────────────────────────────────────────────────
// @termuijs/tss — Tests for @keyframes support
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer.js';
import { TokenType } from './tokenizer.js';
import { parse } from './parser.js';
import { extractKeyframes } from './animations.js';

// ── Pre-check: tokenizer handles % correctly ──

it('tokenizer produces Number then Percent for 0%', () => {
    const tokens = tokenize('0%');
    const nums = tokens.filter(t => t.type === TokenType.Number);
    const pcts = tokens.filter(t => t.type === TokenType.Percent);
    expect(nums).toHaveLength(1);
    expect(nums[0].value).toBe('0');
    expect(pcts).toHaveLength(1);
});

it('tokenizer produces Number then Percent for 100%', () => {
    const tokens = tokenize('100%');
    const nums = tokens.filter(t => t.type === TokenType.Number);
    expect(nums[0].value).toBe('100');
    expect(tokens.filter(t => t.type === TokenType.Percent)).toHaveLength(1);
});

// ── Parsing via tokenizer → parser pipeline ──

it('parses @keyframes with two frames', () => {
    const ast = parse(tokenize(
        `@keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }`
    ));
    expect(ast.keyframes).toHaveLength(1);
    expect(ast.keyframes[0].name).toBe('fadeIn');
    expect(ast.keyframes[0].frames).toHaveLength(2);
    expect(ast.keyframes[0].frames[0].offset).toBe('0%');
    expect(ast.keyframes[0].frames[0].properties[0]).toMatchObject({ name: 'opacity' });
});

it('parses multiple @keyframes declarations', () => {
    const ast = parse(tokenize(
        `@keyframes a { 0% { x: 1; } 100% { x: 2; } }
         @keyframes b { 0% { y: 1; } 100% { y: 2; } }`
    ));
    expect(ast.keyframes).toHaveLength(2);
    expect(ast.keyframes[0].name).toBe('a');
    expect(ast.keyframes[1].name).toBe('b');
});

it('handles empty @keyframes block', () => {
    const ast = parse(tokenize(`@keyframes empty { }`));
    expect(ast.keyframes).toHaveLength(1);
    expect(ast.keyframes[0].frames).toHaveLength(0);
});

it('throws when keyframe offset lacks % sign', () => {
    expect(() => parse(tokenize(
        `@keyframes fade { 0 { opacity: 0; } }`
    ))).toThrow();
});

// ── extractKeyframes ──

it('extractKeyframes produces Record<string, Record<string, string>>', () => {
    const ast = parse(tokenize(
        `@keyframes fadeIn { 0% { opacity: 0; color: var(--base); } 100% { opacity: 1; color: blue; } }`
    ));
    const decls = extractKeyframes(ast);
    expect(decls).toHaveLength(1);
    expect(decls[0].frames).toEqual({
        '0%':   { opacity: '0',   color: 'var(--base)' },
        '100%': { opacity: '1',   color: 'blue' },
    });
});

it('extractKeyframes merges properties from duplicate offsets', () => {
    const ast = parse(tokenize(
        `@keyframes pulse { 0% { opacity: 0; } 0% { scale: 1; } 100% { opacity: 1; } }`
    ));
    const decls = extractKeyframes(ast);
    expect(decls).toHaveLength(1);
    expect(decls[0].frames['0%']).toEqual({ opacity: '0', scale: '1' });
    expect(decls[0].frames['100%']).toEqual({ opacity: '1' });
});
