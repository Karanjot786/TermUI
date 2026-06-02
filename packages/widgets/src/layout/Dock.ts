import { Widget } from '../base/Widget.js';
import { type Rect, type Style } from '@termuijs/core';

export type DockEdge = 'top' | 'right' | 'bottom' | 'left' | 'fill';

export interface DockItem {
    widget: Widget;
    edge: DockEdge;
    /** Required for all edges except 'fill' */
    size?: number;
}

export class Dock extends Widget {
    private items: DockItem[];

    protected _renderSelf(): void {
        // no-op — Dock is a layout-only container
    }

    constructor(items: DockItem[], style?: Partial<Style>) {
        super(style);
        this.items = [];
        this.setItems(items); // reuse setItems to avoid duplicating child-registration logic
    }

    setItems(items: DockItem[]): void {
        this.validateItems(items);

        for (const item of this.items) {
            this.removeChild(item.widget);
        }

        this.items = items;

        for (const item of items) {
            this.addChild(item.widget);
        }

        this.markDirty();
    }

    protected onLayout(rect: Rect): void {
        if (this.items.length === 0) return;

        let remainingRect = { ...rect };

        for (const item of this.items) {
            if (item.edge === 'fill') {
                // fill always consumes whatever is left; no need to update remainingRect
                (item.widget as any).updateRect(remainingRect);
                continue;
            }

            const childRect = this.computeChildRect(remainingRect, item);
            if (childRect) {
                (item.widget as any).updateRect(childRect);
                remainingRect = this.updateRemainingRect(remainingRect, item, childRect);
            }
        }
    }

    /**
     * Validates item list:
     * - At most one 'fill' item
     * - Non-fill items must have a size > 0
     * - 'fill' item should come last (warn if not)
     */
    private validateItems(items: DockItem[]): void {
        const fillItems = items.filter(i => i.edge === 'fill');

        if (fillItems.length > 1) {
            throw new Error(`Dock: only one 'fill' item is allowed, got ${fillItems.length}`);
        }

        for (const item of items) {
            if (item.edge !== 'fill') {
                const size = item.size ?? 0;
                if (size <= 0) {
                    throw new Error(
                        `Dock: item with edge '${item.edge}' must have a size > 0`
                    );
                }
            }
        }

        const fillIndex = items.findIndex(i => i.edge === 'fill');
        if (fillIndex !== -1 && fillIndex !== items.length - 1) {
            this.warn(
                `Dock: 'fill' item is at index ${fillIndex} but should be last. ` +
                `Items after 'fill' will overlap it.`
            );
        }
    }

    private warn(message: string): void {
        const root = Function('return this')();
        if (root && root.console && typeof root.console.warn === 'function') {
            root.console.warn(message);
        }
    }

    private computeChildRect(rect: Rect, item: DockItem): Rect | null {
        // size is guaranteed > 0 for non-fill items after validateItems()
        const size = item.size!;

        switch (item.edge) {
            case 'top':
                return {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: Math.min(size, rect.height)
                };
            case 'bottom':
                return {
                    x: rect.x,
                    y: rect.y + rect.height - Math.min(size, rect.height),
                    width: rect.width,
                    height: Math.min(size, rect.height)
                };
            case 'left':
                return {
                    x: rect.x,
                    y: rect.y,
                    width: Math.min(size, rect.width),
                    height: rect.height
                };
            case 'right':
                return {
                    x: rect.x + rect.width - Math.min(size, rect.width),
                    y: rect.y,
                    width: Math.min(size, rect.width),
                    height: rect.height
                };
            default:
                return null;
        }
    }

    private updateRemainingRect(rect: Rect, item: DockItem, childRect: Rect): Rect {
        const newRect = { ...rect };

        switch (item.edge) {
            case 'top':
                newRect.y = childRect.y + childRect.height;
                newRect.height = rect.height - childRect.height;
                break;
            case 'bottom':
                newRect.height = rect.height - childRect.height;
                break;
            case 'left':
                newRect.x = childRect.x + childRect.width;
                newRect.width = rect.width - childRect.width;
                break;
            case 'right':
                newRect.width = rect.width - childRect.width;
                break;
        }

        return newRect;
    }
}