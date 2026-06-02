import { describe, it, expect, vi } from 'vitest';
import { Dock, type DockItem } from './Dock.js';
import { Widget as BaseWidget } from '../base/Widget.js';

class Widget extends BaseWidget {
    public getRect() {
        return (this as any)._rect ?? (this as any).rect;
    }

    protected _renderSelf(): void {
        // No-op for tests
    }
}

describe('Dock', () => {
    it('top item occupies full row 0', () => {
        const topWidget = new Widget();
        const fillWidget = new Widget();

        const items: DockItem[] = [
            { widget: topWidget, edge: 'top', size: 3 },
            { widget: fillWidget, edge: 'fill' }
        ];

        const dock = new Dock(items);
        dock.updateRect({ x: 0, y: 0, width: 80, height: 24 });

        expect(topWidget.getRect()).toEqual({ x: 0, y: 0, width: 80, height: 3 });
        expect(fillWidget.getRect()).toEqual({ x: 0, y: 3, width: 80, height: 21 });
    });

    it('bottom item occupies the last row', () => {
        const bottomWidget = new Widget();
        const fillWidget = new Widget();

        const items: DockItem[] = [
            { widget: fillWidget, edge: 'fill' },
            { widget: bottomWidget, edge: 'bottom', size: 2 }
        ];

        const dock = new Dock(items);
        dock.updateRect({ x: 0, y: 0, width: 80, height: 24 });

        expect(bottomWidget.getRect()).toEqual({ x: 0, y: 22, width: 80, height: 2 });
        expect(fillWidget.getRect()).toEqual({ x: 0, y: 0, width: 80, height: 22 });
    });

    it('fill item occupies the remaining center area', () => {
        const topWidget = new Widget();
        const bottomWidget = new Widget();
        const leftWidget = new Widget();
        const rightWidget = new Widget();
        const fillWidget = new Widget();

        const items: DockItem[] = [
            { widget: topWidget, edge: 'top', size: 2 },
            { widget: bottomWidget, edge: 'bottom', size: 3 },
            { widget: leftWidget, edge: 'left', size: 10 },
            { widget: rightWidget, edge: 'right', size: 15 },
            { widget: fillWidget, edge: 'fill' }
        ];

        const dock = new Dock(items);
        dock.updateRect({ x: 0, y: 0, width: 80, height: 24 });

        expect(topWidget.getRect()).toEqual({ x: 0, y: 0, width: 80, height: 2 });
        expect(bottomWidget.getRect()).toEqual({ x: 0, y: 21, width: 80, height: 3 });
        expect(leftWidget.getRect()).toEqual({ x: 0, y: 2, width: 10, height: 19 });
        expect(rightWidget.getRect()).toEqual({ x: 65, y: 2, width: 15, height: 19 });
        expect(fillWidget.getRect()).toEqual({ x: 10, y: 2, width: 55, height: 19 });
    });

    it('setItems triggers markDirty', () => {
        const widget1 = new Widget();
        const widget2 = new Widget();
        const fillWidget = new Widget();

        const initialItems: DockItem[] = [
            { widget: widget1, edge: 'top', size: 3 },
            { widget: fillWidget, edge: 'fill' }
        ];

        const dock = new Dock(initialItems);
        const markDirtySpy = vi.spyOn(dock, 'markDirty');

        const newItems: DockItem[] = [
            { widget: widget2, edge: 'top', size: 5 },
            { widget: fillWidget, edge: 'fill' }
        ];

        dock.setItems(newItems);

        expect(markDirtySpy).toHaveBeenCalled();
    });
});