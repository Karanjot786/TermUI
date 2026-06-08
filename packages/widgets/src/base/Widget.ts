// ─────────────────────────────────────────────────────
// @termuijs/widgets — Base Widget class
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type LayoutNode,
    type Rect,
    type KeyEvent,
    type MouseEvent as TermMouseEvent,
    defaultStyle,
    mergeStyles,
    createLayoutNode,
    EventEmitter,
    normalizeEdges,
    getBorderChars,
    styleToCellAttrs,
    containsPoint,
    caps,
} from '@termuijs/core';

/**
 * Event map for widgets.
 */
export interface WidgetEvents {
    key: KeyEvent;
    mouse: TermMouseEvent;
    focus: void;
    blur: void;
    mount: void;
    unmount: void;
}

let _widgetIdCounter = 0;

/** Reset the widget ID counter (for testing only). */
export function _resetWidgetIdCounter(): void {
    _widgetIdCounter = 0;
}

/**
 * Base class for all TermUI widgets.
 *
 * CONSTRUCTOR SIGNATURE CONVENTION:
 * - Simple display widgets: (content?, style?: Partial<Style>, opts?: SpecificOptions)
 * - Data widgets:           (data, style?: Partial<Style>, opts?: SpecificOptions)
 * - Compound UI widgets:    (options: SpecificOptions, style?: Partial<Style>)
 *
 * FOCUSABLE PATTERN:
 * Set `focusable = true` as a class field initializer, OR in the constructor
 * body after calling `super()`. Do NOT set it inside `_renderSelf()`.
 *
 * STYLE MERGE PATTERN:
 * All widgets should call `super(mergeStyles(defaultStyle(), { ...defaults }, style))`
 * to produce consistent base styles. For widgets that accept `style` as the
 * second parameter, pass it directly through to `super()`.
 *
 * Provides:
 * - Unique ID generation
 * - Style management and merging
 * - Layout node generation with rect sync
 * - Border/padding rendering into the screen buffer
 * - Child management
 * - Focus support
 * - Event emission
 */
export abstract class Widget {
    /** Unique widget identifier */
    readonly id: string;

    /** Widget's style */
    protected _style: Style;

    /** Child widgets */
    protected _children: Widget[] = [];

    /** Parent widget (null for root) */
    parent: Widget | null = null;

    /** Computed layout rectangle */
    protected _rect: Rect = { x: 0, y: 0, width: 0, height: 0 };

    /** Reference to the layout node (set during getLayoutNode) */
    private _layoutNode: LayoutNode | null = null;

    /** Error from last render call, null if no error */
    protected _renderError: Error | null = null;

    /** Whether this widget can receive focus */
    focusable = false;

    /** Tab index for focus ordering */
    tabIndex = 0;

    /** Event emitter for this widget */
    readonly events = new EventEmitter<WidgetEvents>();

    /** Whether the widget is currently focused */
    isFocused = false;

    /**
     * Dirty flag — true when this widget needs re-rendering.
     * Newly created widgets start dirty.
     */
    protected _dirty = true;

    constructor(style: Partial<Style> = {}) {
        this.id = `widget_${++_widgetIdCounter}`;
        this._style = mergeStyles(defaultStyle(), style);
    }

    /** Check if this widget is currently active (focused) */
    isActive(): boolean {
        return this.isFocused;
    }

    /** Get the current style */
    get style(): Style { return this._style; }

    /** Update the style (merge with existing) */
    setStyle(style: Partial<Style>): void {
        this._style = mergeStyles(this._style, style);
        this.markDirty();
    }

    /** Get the computed rect after layout */
    get rect(): Rect { return this._rect; }

    /** Add a child widget */
    addChild(child: Widget): void {
        child.parent = this;
        this._children.push(child);
    }

    /** Remove a child widget */
    removeChild(child: Widget): void {
        const idx = this._children.indexOf(child);
        if (idx >= 0) {
            this._children.splice(idx, 1);
            child.parent = null;
        }
    }

    /** Remove all children */
    clearChildren(): void {
        for (const child of this._children) {
            child.parent = null;
        }
        this._children = [];
    }

    /** Get all children */
    get children(): ReadonlyArray<Widget> { return this._children; }

    /**
     * Build the LayoutNode tree for this widget.
     * Stores a reference so we can sync computed rects back via syncLayout().
     */
    getLayoutNode(): LayoutNode {
        const childNodes = this._children
            .filter(c => c.style.visible !== false)
            .map(c => c.getLayoutNode());

        if (this._layoutNode) {
            this._layoutNode.style = this._style;
            this._layoutNode.children = childNodes;
        } else {
            this._layoutNode = createLayoutNode(this.id, this._style, childNodes);
        }
        return this._layoutNode;
    }

    /**
     * After computeLayout() has been called, sync the computed rects
     * from the layout tree back into widget `_rect` fields.
     * This MUST be called after computeLayout() and before render().
     */
    syncLayout(): void {
        if (this._layoutNode) {
            this._rect = { ...this._layoutNode.computed };
        }

        // Sync children (match visible children to layout node children)
        const visibleChildren = this._children.filter(c => c.style.visible !== false);
        for (let i = 0; i < visibleChildren.length; i++) {
            visibleChildren[i].syncLayout();
        }
    }

    /**
     * Render this widget (and children) into the screen buffer.
     * Automatically pushes a clip region if overflow is hidden (default).
     */
    render(screen: Screen): void {
        if (this._style.visible === false) return;

        // Push clip region if overflow is hidden (default style)
        const shouldClip = this._style.overflow !== 'visible';
        if (shouldClip) {
            screen.pushClip(this._rect);
        }

        // Render own content with error isolation
        try {
            this._renderSelf(screen);
            this._renderError = null;
            this._dirty = false;
        } catch (err) {
            this._renderError = err instanceof Error ? err : new Error(String(err));
            // Keep widget dirty so it will be retried on the next frame
            this._dirty = true;
            // Visual fallback in dev mode — show a red placeholder with widget name
            if (process.env.NODE_ENV !== 'production') {
                const { x, y, width } = this._rect;
                if (width > 2) {
                    const label = `Error: ${this.constructor.name}`;
                    const truncated = label.slice(0, Math.max(3, width - 2));
                    screen.writeString(x + 1, y, truncated, {
                        fg: { type: 'named', name: 'red' },
                    });
                }
            }
        }

        // Render border
        this._renderBorder(screen);

        // Render children
        for (const child of this._children) {
            child.render(screen);
        }

        // Pop clip region
        if (shouldClip) {
            screen.popClip();
        }
    }

    /**
     * Override this to render the widget's own content.
     * The rect is available as `this._rect`.
     */
    protected abstract _renderSelf(screen: Screen): void;

    /**
     * Update the computed rect from layout results.
     */
    updateRect(rect: Rect): void {
        this._rect = rect;
    }

    /**
     * Mark this widget as needing re-render.
     * Propagates up to parent so the render loop can detect changes.
     */
    markDirty(): void {
        if (this._dirty) return; // Already dirty
        this._dirty = true;
        if (this._layoutNode) {
            this._layoutNode._dirty = true;
        }
        this.parent?.markDirty();
    }

    /**
     * Clear the dirty flag after rendering.
     * Widgets with a render error stay dirty so they are retried on the next frame.
     */
    clearDirty(): void {
        if (this._renderError) {
            this._dirty = true;
            return;
        }
        this._dirty = false;
        for (const child of this._children) {
            child.clearDirty();
            // If child remains dirty due to render error, keep ancestor dirty too
            if (child._dirty) {
                this._dirty = true;
            }
        }
    }

    /** Check if this widget (or any child) needs re-rendering */
    get isDirty(): boolean { return this._dirty; }

    /** Get the last render error, if any */
    get renderError(): Error | null { return this._renderError; }

    /**
     * Render the border around this widget, including focus ring if focused.
     */
    protected _renderBorder(screen: Screen): void {
        const border = this._style.border;
        const hasBorder = border && border !== 'none';
        const showFocusRing = this.isFocused && this.focusable
            && this._style.focusRingStyle !== 'none';

        if (!hasBorder && !showFocusRing) return;

        const { x, y, width, height } = this._rect;
        if (width < 2 || height < 2) return;

        if (hasBorder) {
            const useAscii =
                (this._style.asciiOnly ?? false) || !caps.unicode;

            const chars = getBorderChars(
                border,
                undefined,
                useAscii
            );

            if (!chars) return;

            const attrs = styleToCellAttrs(this._style);
            const borderFg = this._style.borderColor ?? attrs.fg;

            // Use focus ring color when focused, otherwise normal border color
            const fg = showFocusRing
                ? (this._style.focusRingColor ?? { type: 'named' as const, name: 'cyan' as const })
                : borderFg;
            const cellStyle = { fg };

            // Top edge
            screen.setCell(x, y, { char: chars.topLeft, ...cellStyle });
            for (let c = 1; c < width - 1; c++) {
                screen.setCell(x + c, y, { char: chars.top, ...cellStyle });
            }
            screen.setCell(x + width - 1, y, { char: chars.topRight, ...cellStyle });

            // Bottom edge
            screen.setCell(x, y + height - 1, { char: chars.bottomLeft, ...cellStyle });
            for (let c = 1; c < width - 1; c++) {
                screen.setCell(x + c, y + height - 1, { char: chars.bottom, ...cellStyle });
            }
            screen.setCell(x + width - 1, y + height - 1, { char: chars.bottomRight, ...cellStyle });

            // Left and right edges
            for (let r = 1; r < height - 1; r++) {
                screen.setCell(x, y + r, { char: chars.left, ...cellStyle });
                screen.setCell(x + width - 1, y + r, { char: chars.right, ...cellStyle });
            }
        } else if (showFocusRing) {
            // No border — render corner bracket focus indicators
            const fg = this._style.focusRingColor ?? { type: 'named' as const, name: 'cyan' as const };
            const cellStyle = { fg, bold: true };

            // Top-left corner
            screen.setCell(x, y, { char: '┌', ...cellStyle });
            if (width > 2) screen.setCell(x + 1, y, { char: '─', ...cellStyle });

            // Top-right corner
            screen.setCell(x + width - 1, y, { char: '┐', ...cellStyle });
            if (width > 2) screen.setCell(x + width - 2, y, { char: '─', ...cellStyle });

            // Bottom-left corner
            screen.setCell(x, y + height - 1, { char: '└', ...cellStyle });
            if (width > 2) screen.setCell(x + 1, y + height - 1, { char: '─', ...cellStyle });

            // Bottom-right corner
            screen.setCell(x + width - 1, y + height - 1, { char: '┘', ...cellStyle });
            if (width > 2) screen.setCell(x + width - 2, y + height - 1, { char: '─', ...cellStyle });

            // Short vertical marks if tall enough
            if (height > 2) {
                screen.setCell(x, y + 1, { char: '│', ...cellStyle });
                screen.setCell(x + width - 1, y + 1, { char: '│', ...cellStyle });
                screen.setCell(x, y + height - 2, { char: '│', ...cellStyle });
                screen.setCell(x + width - 1, y + height - 2, { char: '│', ...cellStyle });
            }
        }
    }

    /**
     * Get the inner content area (after border + padding).
     */
    protected _getContentRect(): Rect {
        const padding = normalizeEdges(this._style.padding);
        const border = this._style.border && this._style.border !== 'none' ? 1 : 0;

        return {
            x: this._rect.x + padding.left + border,
            y: this._rect.y + padding.top + border,
            width: Math.max(0, this._rect.width - padding.left - padding.right - border * 2),
            height: Math.max(0, this._rect.height - padding.top - padding.bottom - border * 2),
        };
    }

    /**
     * Check if a point hits this widget.
     */
    hitTest(x: number, y: number): boolean {
        return containsPoint(this._rect, x, y);
    }

    /** Lifecycle: called when the widget is mounted */
    mount(): void {
        this.events.emit('mount', undefined as any);
        for (const child of this._children) {
            child.mount();
        }
    }

    /** Lifecycle: called when the widget is unmounted */
    unmount(): void {
        for (const child of this._children) {
            child.unmount();
        }
        this.events.emit('unmount', undefined as any);
        this.events.removeAll();
    }
}