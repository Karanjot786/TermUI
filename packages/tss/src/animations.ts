// ─────────────────────────────────────────────────────
// @termuijs/tss — @keyframes support
// ─────────────────────────────────────────────────────

import type { TSSStylesheet } from './parser.js';

// ── Public types ──

/** A single @keyframes declaration in consumer-facing format.
 *  Matches the issue spec shape: { '0%': { color: 'red' }, '100%': { color: 'blue' } } */
export interface KeyframesDeclaration {
    name: string;
    /** Map of percentage offset → CSS property map */
    frames: Record<string, Record<string, string>>;
}

// ── Extract from parsed stylesheet ──

/** Extract KeyframesDeclaration[] from a parsed TSS stylesheet.
 *  Call after parse(tokenize(source)) to convert internal AST to
 *  the consumer-friendly Record<string, Record<string, string>> format.
 *
 *  @example
 *  const ast = parse(tokenize(tssSource));
 *  const anims = extractKeyframes(ast);
 *  // anims[0].frames → { '0%': { opacity: '0' }, '100%': { opacity: '1' } }
 */
export function extractKeyframes(stylesheet: TSSStylesheet): KeyframesDeclaration[] {
    return stylesheet.keyframes.map(kf => ({
        name: kf.name,
        frames: Object.fromEntries(
            kf.frames.map(frame => [
                frame.offset,
                Object.fromEntries(
                    frame.properties.map(p => [p.name, serializeValue(p.value)]),
                ),
            ]),
        ),
    }));
}

// ── Internal ──

/** Convert typed TSSValue to its plain string representation. */
function serializeValue(v: { kind: string; value?: unknown; name?: string }): string {
    switch (v.kind) {
        case 'var':    return `var(${v.name})`;
        case 'color':  // falls through — both carry a string .value
        case 'number': return String(v.value ?? '');
        default:       return String(v.value ?? '');   // 'literal' and future kinds
    }
}
