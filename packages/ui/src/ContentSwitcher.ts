// ContentSwitcher — show a single active child widget
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle } from '@termuijs/core';

export class ContentSwitcher extends Widget {
    private _activeId?: string;

    constructor(style: Partial<Style> = {}) {
        super(mergeStyles(defaultStyle(), style));
    }

    get activeId(): string | undefined {
        return this._activeId;
    }

    override addChild(child: Widget): void {
        super.addChild(child);
        if (this._activeId === undefined) {
            this._activeId = child.id;
        }
        this._updateChildVisibility();
    }

    setActive(id: string): void {
        if (id === this._activeId) return;
        const child = this._children.find((c) => c.id === id);
        if (!child) return;
        this._activeId = id;
        this._updateChildVisibility();
        this.markDirty();
    }

    protected _renderSelf(_screen: Screen): void {
        // Container only
    }

    private _updateChildVisibility(): void {
        for (const child of this._children) {
            child.setStyle({ visible: child.id === this._activeId });
        }
    }
}
