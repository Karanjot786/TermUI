// ─────────────────────────────────────────────────────
// @termuijs/core — WidgetNode interface
// ─────────────────────────────────────────────────────

import type { LayoutNode } from '../layout/LayoutEngine.js';
import type { Rect } from '../layout/Rect.js';
import type { Style } from '../style/Style.js';
import type { Screen } from '../terminal/Screen.js';
import type { MouseEvent as TermMouseEvent } from '../events/types.js';

/**
 * Minimal event emitter contract for widget traversal.
 * Widgets emit events via this interface during bubble dispatch and hit-testing.
 */
export interface WidgetEventEmitter {
    emit(event: string, data: unknown): void;
}

/**
 * The minimum contract that App.ts requires to traverse, render, and manage
 * focus on a widget tree. This interface lives in `@termuijs/core` so that
 * both `App` (core) and `Widget` (widgets) can reference it without creating
 * a circular dependency.
 *
 * The full `Widget` class in `@termuijs/widgets` implements this interface.
 * Custom widget implementations must also satisfy this contract to work with `App`.
 */
export interface WidgetNode {
    /** Unique widget identifier */
    readonly id: string;

    /** Parent widget (null for root) */
    parent: WidgetNode | null;

    /** Child widgets (may be a getter returning ReadonlyArray) */
    readonly children: ReadonlyArray<WidgetNode>;

    /** Event emitter for this widget */
    readonly events: WidgetEventEmitter;

    /** Computed layout rectangle after syncLayout() */
    readonly rect: Rect;

    /** Widget style */
    readonly style: Style;

    /** Whether the widget is currently focused */
    isFocused: boolean;

    /** Build the LayoutNode tree for this widget */
    getLayoutNode(): LayoutNode;

    /** Sync computed rects from layout tree back to widget _rect fields */
    syncLayout(): void;

    /** Render this widget into the screen buffer */
    render(screen: Screen): void;

    /** Lifecycle: called when the widget is mounted */
    mount(): void;

    /** Lifecycle: called when the widget is unmounted */
    unmount(): void;

    /** Mark this widget as needing re-render */
    markDirty(): void;

    /** Check if this widget needs re-rendering */
    readonly isDirty: boolean;

    /** Clear the dirty flag after rendering */
    clearDirty(): void;

    /** Optional tooltip text shown on hover/focus */
    tooltip?: string;

    /** Optional callback for mouse click events */
    onClick?: (event: TermMouseEvent) => void;

    /** Optional callback for mouse enter events */
    onMouseEnter?: (event: TermMouseEvent) => void;

    /** Optional callback for mouse leave events */
    onMouseLeave?: (event: TermMouseEvent) => void;
}

/**
 * Type guard to check if a value is a WidgetNode.
 */
export function isWidgetNode(value: unknown): value is WidgetNode {
    return typeof value === 'object'
        && value !== null
        && 'id' in value
        && typeof (value as WidgetNode).id === 'string'
        && 'children' in value;
}
