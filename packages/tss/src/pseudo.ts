// ─────────────────────────────────────────────────────────────────
// @termuijs/tss – Dynamic Pseudo-class AST Evaluator
// ─────────────────────────────────────────────────────────────────

export interface WidgetContext {
  hover?: boolean;
  focus?: boolean;
  focusWithin?: boolean;
  disabled?: boolean;
  index?: number;
  totalChildren?: number;
  element?: string;
  classes?: string[];
  attributes?: Record<string, string>;
}

export type PseudoClass =
  | 'hover'
  | 'focus'
  | 'focus-within'
  | 'disabled'
  | 'first-child'
  | 'last-child'
  | string;

/**
 * Matches a selector's pseudo-class against the current widget state or context.
 *
 * @param selectorPseudo - the pseudo string from the parsed selector (e.g. "hover", "nth-child(even)")
 * @param stateOrContext - string state or WidgetContext object
 * @returns true if the rule applies for this state/context
 */
export function matchesPseudo(
  selectorPseudo: string | undefined,
  stateOrContext: string | WidgetContext | undefined,
): boolean {
  if (!selectorPseudo) return true;
  if (!stateOrContext) return false;

  const context: WidgetContext =
    typeof stateOrContext === 'string'
      ? {
          hover: stateOrContext === 'hover',
          focus: stateOrContext === 'focus',
          focusWithin: stateOrContext === 'focus-within' || stateOrContext === 'focusWithin',
          disabled: stateOrContext === 'disabled',
        }
      : stateOrContext;

  const pseudo = selectorPseudo.trim();

  if (pseudo === 'hover') return Boolean(context.hover);
  if (pseudo === 'focus') return Boolean(context.focus);
  if (pseudo === 'focus-within' || pseudo === 'focusWithin') {
    return Boolean(context.focusWithin || context.focus);
  }
  if (pseudo === 'disabled') return Boolean(context.disabled);
  if (pseudo === 'first-child') return context.index === 0;
  if (pseudo === 'last-child') {
    return (
      context.index !== undefined &&
      context.totalChildren !== undefined &&
      context.index === context.totalChildren - 1
    );
  }

  // Handle :nth-child(...)
  const nthMatch = pseudo.match(/^nth-child\(([^)]+)\)$/);
  if (nthMatch) {
    if (context.index === undefined) return false;
    const index1Based = context.index + 1;
    const arg = nthMatch[1].trim().toLowerCase();

    if (arg === 'even') return index1Based % 2 === 0;
    if (arg === 'odd') return index1Based % 2 !== 0;

    if (/^\d+$/.test(arg)) {
      return index1Based === parseInt(arg, 10);
    }

    // An+B regex match (e.g., "2n+1", "3n", "2n-1")
    const abMatch = arg.match(/^([+-]?\d*)n\s*([+-]\s*\d+)?$/);
    if (abMatch) {
      let a = abMatch[1] === '' || abMatch[1] === '+' ? 1 : abMatch[1] === '-' ? -1 : parseInt(abMatch[1], 10);
      let b = abMatch[2] ? parseInt(abMatch[2].replace(/\s+/g, ''), 10) : 0;

      if (a === 0) return index1Based === b;
      const diff = index1Based - b;
      return diff % a === 0 && diff / a >= 0;
    }
  }

  // Handle :not(pseudo)
  const notMatch = pseudo.match(/^not\(([^)]+)\)$/);
  if (notMatch) {
    const subPseudo = notMatch[1].trim();
    return !matchesPseudo(subPseudo, context);
  }

  return false;
}