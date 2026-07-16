// ─────────────────────────────────────────────────────────────────
// @termuijs/tss – Pseudo-class state matching
// ─────────────────────────────────────────────────────────────────

/**
 * Supported pseudo-class states for TSS selector matching.
 * Selector matching is flat – no descendant combinator in this engine.
 */
export type PseudoClass = 'hover' | 'focus' | 'disabled';

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