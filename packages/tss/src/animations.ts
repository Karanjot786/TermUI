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
    return stylesheet.keyframes.map(kf => {
        const frames: Record<string, Record<string, string>> = {};
        for (const frame of kf.frames) {
            const props: Record<string, string> = {};
            for (const p of frame.properties) {
                props[p.name] = serializeValue(p.value);
            }
            frames[frame.offset] = { ...(frames[frame.offset] ?? {}), ...props };
        }
        return { name: kf.name, frames };
    });
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
