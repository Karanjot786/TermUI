// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Color module
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    parseColor,
    colorToRgb,
    colorToAnsiFg,
    colorToAnsiBg,
    detectColorDepth,
    ColorDepth,
} from '../style/Color.js';

describe('parseColor', () => {
    it('parses named colors', () => {
        expect(parseColor('red')).toEqual({ type: 'named', name: 'red' });
        expect(parseColor('brightBlue')).toEqual({ type: 'named', name: 'brightBlue' });
    });

    it('parses hex colors (6-digit)', () => {
        expect(parseColor('#ff0000')).toEqual({ type: 'hex', hex: '#ff0000' });
    });

    it('parses hex colors (3-digit shorthand)', () => {
        expect(parseColor('#f00')).toEqual({ type: 'hex', hex: '#ff0000' });
    });

    it('parses rgb() colors', () => {
        expect(parseColor('rgb(255, 128, 0)')).toEqual({ type: 'rgb', r: 255, g: 128, b: 0 });
    });

    it('parses ansi256() colors', () => {
        expect(parseColor('ansi256(196)')).toEqual({ type: 'ansi256', code: 196 });
    });

    it('returns none for empty string', () => {
        expect(parseColor('')).toEqual({ type: 'none' });
        expect(parseColor('none')).toEqual({ type: 'none' });
    });

    it('returns none for invalid/unknown colors (graceful fallback)', () => {
        expect(parseColor('notacolor')).toEqual({ type: 'none' });
        expect(parseColor('#xyz')).toEqual({ type: 'none' });
        expect(parseColor('#zzzzzz')).toEqual({ type: 'none' });
    });

    it('clamps rgb values to 255', () => {
        const c = parseColor('rgb(999, 0, 0)');
        expect(c).toEqual({ type: 'rgb', r: 255, g: 0, b: 0 });
    });
});

describe('colorToRgb', () => {
    it('converts named colors', () => {
        expect(colorToRgb({ type: 'named', name: 'red' })).toEqual([170, 0, 0]);
    });

    it('converts hex colors', () => {
        expect(colorToRgb({ type: 'hex', hex: '#ff8000' })).toEqual([255, 128, 0]);
    });

    it('converts rgb pass-through', () => {
        expect(colorToRgb({ type: 'rgb', r: 100, g: 200, b: 50 })).toEqual([100, 200, 50]);
    });

    it('converts none to black', () => {
        expect(colorToRgb({ type: 'none' })).toEqual([0, 0, 0]);
    });
});

describe('colorToAnsiFg / colorToAnsiBg', () => {
    it('generates TrueColor fg escape', () => {
        const result = colorToAnsiFg({ type: 'rgb', r: 255, g: 0, b: 0 }, ColorDepth.TrueColor);
        expect(result).toBe('\x1b[38;2;255;0;0m');
    });

    it('generates TrueColor bg escape', () => {
        const result = colorToAnsiBg({ type: 'rgb', r: 0, g: 255, b: 0 }, ColorDepth.TrueColor);
        expect(result).toBe('\x1b[48;2;0;255;0m');
    });

    it('generates 256-color fg escape', () => {
        const result = colorToAnsiFg({ type: 'rgb', r: 255, g: 0, b: 0 }, ColorDepth.Ansi256);
        expect(result).toMatch(/^\x1b\[38;5;\d+m$/);
    });

    it('generates basic color fg escape', () => {
        const result = colorToAnsiFg({ type: 'named', name: 'red' }, ColorDepth.Basic);
        expect(result).toMatch(/^\x1b\[\d+m$/);
    });

    it('returns empty string for none color', () => {
        expect(colorToAnsiFg({ type: 'none' }, ColorDepth.TrueColor)).toBe('');
    });

    it('returns empty string for no color depth', () => {
        expect(colorToAnsiFg({ type: 'named', name: 'red' }, ColorDepth.None)).toBe('');
    });
});

describe('detectColorDepth', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Clean env for consistent testing
        process.env = { ...originalEnv };
        delete process.env['NO_COLOR'];
        delete process.env['FORCE_COLOR'];
        delete process.env['COLORTERM'];
        delete process.env['TERM'];
        delete process.env['TERM_PROGRAM'];
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns None when NO_COLOR is set', () => {
        process.env['NO_COLOR'] = '1';
        expect(detectColorDepth()).toBe(ColorDepth.None);
    });

    it('returns TrueColor when COLORTERM=truecolor', () => {
        process.env['COLORTERM'] = 'truecolor';
        expect(detectColorDepth()).toBe(ColorDepth.TrueColor);
    });

    it('returns TrueColor when COLORTERM=24bit', () => {
        process.env['COLORTERM'] = '24bit';
        expect(detectColorDepth()).toBe(ColorDepth.TrueColor);
    });

    it('returns None when TERM=dumb', () => {
        process.env['TERM'] = 'dumb';
        expect(detectColorDepth()).toBe(ColorDepth.None);
    });

    it('respects FORCE_COLOR=0', () => {
        process.env['FORCE_COLOR'] = '0';
        expect(detectColorDepth()).toBe(ColorDepth.None);
    });

    it('respects FORCE_COLOR=3', () => {
        process.env['FORCE_COLOR'] = '3';
        expect(detectColorDepth()).toBe(ColorDepth.TrueColor);
    });
});
