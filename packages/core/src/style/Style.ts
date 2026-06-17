// ─────────────────────────────────────────────────────
// @termuijs/core — Style definition and merging
// ─────────────────────────────────────────────────────

import type { Color } from './Color.js';
import type { BorderStyle } from './Border.js';
import type { Pos } from '../layout/pos.js';
import type { Dim } from '../layout/dim.js';
import type { Constraint } from '../layout/constraint.js';

/**
 * Edge values (padding, margin) — top, right, bottom, left.
 */
export interface Edges {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

/**
 * Complete style definition for a widget.
 */
export interface Style {
    // ── Colors ──────────────
    fg?: Color;
    bg?: Color;

    // ── Text Decoration ─────
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    dim?: boolean;
    strikethrough?: boolean;
    inverse?: boolean;

    // ── Box Model ───────────
    padding?: Partial<Edges> | number;
    margin?: Partial<Edges> | number;
    border?: BorderStyle;
    asciiOnly?: boolean; 
    borderColor?: Color;

    // ── Dimensions ──────────
    width?: number | string | Dim;    // number = fixed chars, string = '50%', Dim = Dimension constraint
    height?: number | string | Dim;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    
    // ── Positional Constraints ─
    x?: number | Pos;
    y?: number | Pos;
    groupId?: string;
    
    // ── 1D Layout Constraints ──
    constraints?: Constraint[];

    // ── Flex Layout ─────────
    flexDirection?: 'row' | 'column';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
    alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
    flexGrow?: number;
    flexShrink?: number;
    flexWrap?: 'nowrap' | 'wrap';
    gap?: number;

    // ── Overflow ────────────
    overflow?: 'visible' | 'hidden' | 'scroll';

    // ── Stacking ────────────
    /** Z-index for layer ordering. Higher values render on top. */
    zIndex?: number;

    // ── Focus ────────────────
    /** Color of the focus ring when this widget has focus */
    focusRingColor?: Color;
    /** Style of the focus ring indicator */
    focusRingStyle?: 'border' | 'corners' | 'glow' | 'none';

    // ── Visibility ──────────
    visible?: boolean;
}

/**
 * Normalize a shorthand edge value (number) into the full Edges object.
 */
export function normalizeEdges(value: Partial<Edges> | number | undefined): Edges {
    if (value === undefined) return { top: 0, right: 0, bottom: 0, left: 0 };
    if (typeof value === 'number') {
        return { top: value, right: value, bottom: value, left: value };
    }
    return {
        top: value.top ?? 0,
        right: value.right ?? 0,
        bottom: value.bottom ?? 0,
        left: value.left ?? 0,
    };
}

/**
 * Merge two styles. `override` values take precedence.
 * Undefined values in override do not overwrite base values.
 */
export function mergeStyles(base: Style, override: Style): Style {
    const result: Style = { ...base };

    for (const key of Object.keys(override) as Array<keyof Style>) {
        const val = override[key];
        if (val !== undefined) {
            (result as any)[key] = val; // as any: keyof Style index write not supported without escape
        }
    }

    return result;
}

/**
 * Create a default (empty) style.
 */
export function defaultStyle(): Style {
    return {
        visible: true,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        flexGrow: 0,
        flexShrink: 1,
        flexWrap: 'nowrap',
        overflow: 'hidden',
        gap: 0,
    };
}

/**
 * Set of style property keys that affect layout.
 * When only non-layout props change, the layout tree can be reused.
 */
export const LAYOUT_PROPS: ReadonlySet<keyof Style> = new Set<keyof Style>([
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'padding', 'margin', 'border',
    'flexDirection', 'justifyContent', 'alignItems', 'flexGrow', 'flexShrink', 'flexWrap', 'gap',
    'overflow', 'visible',
]);

/**
 * Returns true when any layout-affecting property differs between old and new style.
 */
export function hasLayoutChanges(oldStyle: Style, newStyle: Style): boolean {
    for (const key of LAYOUT_PROPS) {
        if (oldStyle[key as keyof Style] !== newStyle[key as keyof Style]) return true;
    }
    return false;
}

/**
 * Extract the cell-level style attributes from a Style object.
 * Used when rendering text into the screen buffer.
 */
export function styleToCellAttrs(style: Style): {
    fg: Color;
    bg: Color;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    dim: boolean;
    strikethrough: boolean;
    inverse: boolean;
} {
    return {
        fg: style.fg ?? { type: 'none' },
        bg: style.bg ?? { type: 'none' },
        bold: style.bold ?? false,
        italic: style.italic ?? false,
        underline: style.underline ?? false,
        dim: style.dim ?? false,
        strikethrough: style.strikethrough ?? false,
        inverse: style.inverse ?? false,
    };
}
