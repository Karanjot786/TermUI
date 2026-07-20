// ─────────────────────────────────────────────────────
// @termuijs/widgets — Columns widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style } from '@termuijs/core';
import { Widget } from '../base/Widget.js';
import { Box } from '../display/Box.js';

export interface ColumnsOptions {
    /** Gap between columns in cells (default: 1) */
    gap?: number;
}

/**
 * Columns — splits available width evenly across child widgets.
 *
 * Children are laid out side-by-side with equal flex-grow.
 * Internally uses a flex-row Box; the addChild override applies
 * flexGrow:1 to each child so the reconciler's generic loop works.
 */
export class Columns extends Widget {
    private _inner: Box;

    constructor(style: Partial<Style> = {}, opts: ColumnsOptions = {}) {
        super(style);
        this._inner = new Box({
            flexDirection: 'row',
            gap: opts.gap ?? 1,
            width: '100%',
            height: '100%',
        });
        super.addChild(this._inner);
    }

    override addChild(widget: Widget): void {
        widget.setStyle({ flexGrow: 1 });
        this._inner.addChild(widget);
    }

    override removeChild(widget: Widget): void {
        this._inner.removeChild(widget);
    }

    override clearChildren(): void {
        this._inner.clearChildren();
    }

    protected _renderSelf(_screen: Screen): void {
        // Pure layout container
    }
}
