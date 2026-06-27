// ─────────────────────────────────────────────────────────────────
// @termuijs/tss – Pseudo-class state matching
// ─────────────────────────────────────────────────────────────────

/**
 * Supported pseudo-class states for TSS selector matching.
 * Selector matching is flat – no descendant combinator in this engine.
 */
export type PseudoClass = 'hover' | 'focus' | 'disabled';

// Typed as ReadonlySet<string> so .has(value) works without assertion
export const SUPPORTED_PSEUDO_CLASSES: ReadonlySet<string> = new Set<string>([
  'hover',
  'focus',
  'disabled',
]);

/**
 * Returns true if the given string is a valid pseudo-class.
 */
export function isSupportedPseudo(value: string): value is PseudoClass {
  return SUPPORTED_PSEUDO_CLASSES.has(value);
}

/**
 * Matches a selector's pseudo-class against the current widget state.
 *
 * @param selectorPseudo - the pseudo from the parsed TSS selector (e.g. "hover")
 * @param statePseudo    - the current state being queried (e.g. "hover")
 * @returns true if the rule applies for this state
 */
export function matchesPseudo(
  selectorPseudo: string | undefined,
  statePseudo: string | undefined,
): boolean {
  // No pseudo on selector → rule applies to all states
  if (!selectorPseudo) return true;
  // Selector has pseudo but state does not → no match
  if (!statePseudo) return false;
  return selectorPseudo === statePseudo;
}