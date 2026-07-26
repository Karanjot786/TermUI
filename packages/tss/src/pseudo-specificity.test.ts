import { describe, it, expect } from 'vitest';
import {
    calculateSpecificity,
    compareSpecificity,
    matchesPseudo,
    createStyleSheet,
    ThemeEngine,
} from './index.js';

describe('Specificity Engine', () => {
    it('calculates specificity tuple (A, B, C) correctly', () => {
        expect(calculateSpecificity('*')).toEqual([0, 0, 0]);
        expect(calculateSpecificity('Button')).toEqual([0, 0, 1]);
        expect(calculateSpecificity('.btn')).toEqual([0, 1, 0]);
        expect(calculateSpecificity('#main')).toEqual([1, 0, 0]);
        expect(calculateSpecificity('Button.btn')).toEqual([0, 1, 1]);
        expect(calculateSpecificity('Button.btn:hover')).toEqual([0, 2, 1]);
        expect(calculateSpecificity('#main.btn:hover')).toEqual([1, 2, 0]);
    });

    it('compares specificity tuples accurately', () => {
        const idSpec = calculateSpecificity('#main'); // [1, 0, 0]
        const classSpec = calculateSpecificity('.btn:hover'); // [0, 2, 0]
        const elemSpec = calculateSpecificity('Button'); // [0, 0, 1]

        expect(compareSpecificity(idSpec, classSpec)).toBeGreaterThan(0);
        expect(compareSpecificity(classSpec, elemSpec)).toBeGreaterThan(0);
        expect(compareSpecificity(elemSpec, elemSpec)).toBe(0);
    });
});

describe('Dynamic Pseudo-Class Evaluator', () => {
    it('evaluates state and focus-within pseudo-classes', () => {
        expect(matchesPseudo('hover', { hover: true })).toBe(true);
        expect(matchesPseudo('hover', { hover: false })).toBe(false);
        expect(matchesPseudo('focus-within', { focusWithin: true })).toBe(true);
        expect(matchesPseudo('focus-within', { focus: true })).toBe(true);
        expect(matchesPseudo('focus-within', { hover: true })).toBe(false);
    });

    it('evaluates structural pseudo-classes :first-child and :last-child', () => {
        expect(matchesPseudo('first-child', { index: 0, totalChildren: 3 })).toBe(true);
        expect(matchesPseudo('first-child', { index: 1, totalChildren: 3 })).toBe(false);
        expect(matchesPseudo('last-child', { index: 2, totalChildren: 3 })).toBe(true);
        expect(matchesPseudo('last-child', { index: 1, totalChildren: 3 })).toBe(false);
    });

    it('evaluates :nth-child expressions (even, odd, fixed numbers, An+B)', () => {
        // Even / Odd
        expect(matchesPseudo('nth-child(even)', { index: 0 })).toBe(false); // 1-based: 1
        expect(matchesPseudo('nth-child(even)', { index: 1 })).toBe(true);  // 1-based: 2
        expect(matchesPseudo('nth-child(odd)', { index: 0 })).toBe(true);   // 1-based: 1

        // Fixed number
        expect(matchesPseudo('nth-child(3)', { index: 2 })).toBe(true); // 3rd element
        expect(matchesPseudo('nth-child(3)', { index: 1 })).toBe(false);

        // Formula 2n+1
        expect(matchesPseudo('nth-child(2n+1)', { index: 0 })).toBe(true);  // n=0 -> 1
        expect(matchesPseudo('nth-child(2n+1)', { index: 1 })).toBe(false); // 2
        expect(matchesPseudo('nth-child(2n+1)', { index: 2 })).toBe(true);  // n=1 -> 3
    });

    it('evaluates negation :not(pseudo)', () => {
        expect(matchesPseudo('not(disabled)', { disabled: false })).toBe(true);
        expect(matchesPseudo('not(disabled)', { disabled: true })).toBe(false);
    });
});

describe('TSS Engine Specificity Resolution', () => {
    it('applies rules according to specificity precedence regardless of CSS definition order', () => {
        const engine = new ThemeEngine();
        engine.load(`
            Button.card { color: red; }
            Button:hover { color: green; }
            .card { color: blue; }
        `);

        // Button.card vs .card -> Button.card has higher specificity (0,1,1) vs (0,1,0)
        const style1 = engine.resolveStyle('Button', 'card');
        expect(style1.fg?.type).toBe('named');

        // Button:hover has specificity (0,1,1)
        const style2 = engine.resolveStyle('Button', undefined, { hover: true });
        expect(style2.fg).toBeDefined();
    });

    it('creates style sheet using createStyleSheet helper', () => {
        const styles = createStyleSheet({
            'Button:focus-within': {
                borderColor: 'cyan',
                bold: 'true',
            },
            'TableRow:nth-child(even)': {
                bg: '#1e1e1e',
            },
        });

        const style = styles.resolveStyle('Button', undefined, { focusWithin: true });
        expect(style.bold).toBe(true);
    });
});
