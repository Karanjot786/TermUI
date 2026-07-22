import { describe, it, expect } from 'vitest';
import { evalCalc } from './calc.js';

describe('evalCalc', () => {
    it('evaluates simple expressions', () => {
        expect(evalCalc('calc(2 + 3)', {})).toBe(5);
        expect(evalCalc('calc(10 - 4)', {})).toBe(6);
        expect(evalCalc('calc(5 * 6)', {})).toBe(30);
        expect(evalCalc('calc(20 / 4)', {})).toBe(5);
    });

    it('respects operator precedence', () => {
        expect(evalCalc('calc(2 + 3 * 4)', {})).toBe(14);
        expect(evalCalc('calc(10 - 6 / 2)', {})).toBe(7);
    });

    it('handles parentheses', () => {
        expect(evalCalc('calc((2 + 3) * 4)', {})).toBe(20);
        expect(evalCalc('calc(10 - (6 / 2))', {})).toBe(7);
        expect(evalCalc('calc(((2 + 3) * 4) / 2)', {})).toBe(10);
    });

    it('resolves variables', () => {
        const vars = { '--w': '10', '--h': '20' };
        expect(evalCalc('calc(var(--w) * 2)', vars)).toBe(20);
        expect(evalCalc('calc(var(--w) + var(--h))', vars)).toBe(30);
        expect(evalCalc('calc((var(--w) + 5) * 2)', vars)).toBe(30);
    });

    it('handles decimal values', () => {
        expect(evalCalc('calc(2.5 * 4)', {})).toBe(10);
        expect(evalCalc('calc(5.5 + 4.5)', {})).toBe(10);
    });

    it('ignores extra whitespace', () => {
        expect(evalCalc('calc(  2   +  3* 4  )', {})).toBe(14);
        expect(evalCalc('calc( var(--w)  *   2 )', { '--w': '10' })).toBe(20);
    });

    it('handles unary operators', () => {
        expect(evalCalc('calc(-5 + 10)', {})).toBe(5);
        expect(evalCalc('calc(10 * -2)', {})).toBe(-20);
    });

    it('throws on division by zero', () => {
        expect(() => evalCalc('calc(10 / 0)', {})).toThrowError('Division by zero');
        expect(() => evalCalc('calc(10 / (2 - 2))', {})).toThrowError('Division by zero');
    });

    it('throws on missing variable', () => {
        expect(() => evalCalc('calc(var(--missing) + 1)', {})).toThrowError("Missing variable '--missing'");
    });

    it('throws on malformed input', () => {
        expect(() => evalCalc('calc(2 +)', {})).toThrowError('Unexpected end of expression');
        expect(() => evalCalc('calc(()', {})).toThrowError('Unexpected end of expression');
        expect(() => evalCalc('calc(foo)', {})).toThrowError("Unexpected token 'f'");
        expect(() => evalCalc('2 + 3', {})).toThrowError('Malformed input');
        expect(() => evalCalc('calc()', {})).toThrowError('empty expression');
    });
});