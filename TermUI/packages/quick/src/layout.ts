// ─────────────────────────────────────────────────────
// @termuijs/quick — Layout helpers
// ─────────────────────────────────────────────────────

import { Box, Text, Widget } from '@termuijs/widgets';
import type { Style } from '@termuijs/core';
import type { Reactive } from './reactive.js';
import { resolve, isReactive } from './reactive.js';

/** Anything that can go into a layout slot */
export type LayoutChild = Widget | string | Reactive<string>;

/**
 * Convert a loose child value into a proper Widget.
 * - Widget → pass through
 * - string → wrap in Text
 * - () => string → wrap in reactive Text (updated externally)
 */
export function toWidget(child: LayoutChild, style: Partial<Style> = {}): Widget {
    if (child instanceof Widget) return child;
    if (typeof child === 'string') {
        return new Text(child, { height: 1, ...style });
    }
    // Reactive function — create text, will be updated by refresh
    const text = new Text(resolve(child as Reactive<string>), { height: 1, ...style });
    return text;
}

/**
 * Horizontal row layout — children arranged left-to-right.
 */
export function row(...children: LayoutChild[]): Widget {
    const widgets = children.map(child => toWidget(child));

    // Check if ALL children have a fixed height — if so, the row itself should be fixed-height
    const allFixedHeight = widgets.every(w => {
        const h = w.style.height;
        return typeof h === 'number' && h > 0;
    });
    // Determine the max fixed height among children (for the row)
    const maxH = allFixedHeight
        ? Math.max(...widgets.map(w => (w.style.height as number) || 1))
        : undefined;

    const box = new Box({
        flexDirection: 'row',
        ...(allFixedHeight ? { height: maxH } : { flexGrow: 1 }),
        gap: 1,
    });

    for (const widget of widgets) {
        // Give each child equal horizontal flex if no explicit grow
        if (!widget.style.flexGrow) {
            widget.setStyle({ flexGrow: 1 });
        }
        box.addChild(widget);
    }
    return box;
}

/**
 * Vertical column layout — children arranged top-to-bottom.
 */
export function col(...children: LayoutChild[]): Widget {
    const box = new Box({
        flexDirection: 'column',
        flexGrow: 1,
    });
    for (const child of children) {
        box.addChild(toWidget(child));
    }
    return box;
}

/**
 * Grid layout — equal-sized cells in a rows × cols grid.
 */
export function grid(rows: number, cols: number, items: LayoutChild[]): Widget {
    const container = new Box({
        flexDirection: 'column',
        flexGrow: 1,
    });

    let idx = 0;
    for (let r = 0; r < rows; r++) {
        const rowBox = new Box({
            flexDirection: 'row',
            flexGrow: 1,
            gap: 1,
        });
        for (let c = 0; c < cols; c++) {
            if (idx < items.length) {
                const widget = toWidget(items[idx]);
                widget.setStyle({ flexGrow: 1 });
                rowBox.addChild(widget);
            }
            idx++;
        }
        container.addChild(rowBox);
    }

    return container;
}

/**
 * Vertical stack, children top-to-bottom, sized to content rather than
 * growing to fill. Use when col()'s flexGrow is too greedy.
 */
export function stack(...children: LayoutChild[]): Widget {
    const box = new Box({
        flexDirection: 'column',
    });
    for (const child of children) {
        box.addChild(toWidget(child));
    }
    return box;
}

/**
 * Flexible empty gap. Grows to fill free space and pushes siblings apart.
 * Optional fixed size in cells.
 */
export function spacer(size?: number): Widget {
    return new Box(size !== undefined ? { height: size } : { flexGrow: 1 });
}
