// ─────────────────────────────────────────────────────
// @termuijs/tss — Selector Specificity Scoring Engine
// ─────────────────────────────────────────────────────

import type { TSSSelector } from './parser.js';

export type SpecificityTuple = [a: number, b: number, c: number];

/**
 * Calculates CSS-compliant specificity tuple (A, B, C) for a given selector.
 * - A: ID selectors (#id)
 * - B: Class selectors (.class), attribute selectors ([attr]), pseudo-classes (:hover, :nth-child)
 * - C: Element / widget type selectors (Button, Text) and pseudo-elements (::before)
 */
export function calculateSpecificity(selector: string | TSSSelector): SpecificityTuple {
    if (typeof selector === 'object') {
        let a = 0;
        let b = 0;
        let c = 0;

        if (selector.widget && selector.widget !== '*') {
            c += 1;
        }

        if (selector.className) {
            const classes = selector.className.split('.').filter(Boolean);
            b += classes.length;
        }

        if (selector.pseudo) {
            const pseudos = selector.pseudo.split(':').filter(Boolean);
            b += pseudos.length;
        }

        return [a, b, c];
    }

    let a = 0;
    let b = 0;
    let c = 0;

    let str = selector.trim();
    if (!str || str === '*') return [0, 0, 0];

    // Count ID selectors (#id)
    const idMatches = str.match(/#[a-zA-Z0-9_-]+/g);
    if (idMatches) {
        a += idMatches.length;
        str = str.replace(/#[a-zA-Z0-9_-]+/g, ' ');
    }

    // Count Attribute selectors ([attr=val])
    const attrMatches = str.match(/\[[^\]]+\]/g);
    if (attrMatches) {
        b += attrMatches.length;
        str = str.replace(/\[[^\]]+\]/g, ' ');
    }

    // Count Pseudo-classes (:hover, :nth-child(even), :not(...))
    const pseudoMatches = str.match(/:[a-zA-Z0-9_-]+(\([^)]*\))?/g);
    if (pseudoMatches) {
        b += pseudoMatches.length;
        str = str.replace(/:[a-zA-Z0-9_-]+(\([^)]*\))?/g, ' ');
    }

    // Count Class selectors (.class)
    const classMatches = str.match(/\.[a-zA-Z0-9_-]+/g);
    if (classMatches) {
        b += classMatches.length;
        str = str.replace(/\.[a-zA-Z0-9_-]+/g, ' ');
    }

    // Count Element selectors
    const elementMatches = str.match(/[a-zA-Z0-9_-]+/g);
    if (elementMatches) {
        c += elementMatches.length;
    }

    return [a, b, c];
}

/**
 * Compares two specificity tuples.
 * Returns > 0 if A is higher specificity than B, < 0 if B is higher, 0 if equal.
 */
export function compareSpecificity(specA: SpecificityTuple, specB: SpecificityTuple): number {
    if (specA[0] !== specB[0]) return specA[0] - specB[0];
    if (specA[1] !== specB[1]) return specA[1] - specB[1];
    return specA[2] - specB[2];
}
