// ─────────────────────────────────────────────────────
// @termuijs/widgets — Sidebar widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, stringWidth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface SidebarItem {
    label: string;
    badge?: string;
    active?: boolean;
}

export interface SidebarOptions {
    /** Whether the sidebar is collapsed */
    collapsed?: boolean;
    /** Collapsed width in cells (default: 3) */
    collapsedWidth?: number;
    /** Active item highlight color */
    activeColor?: import('@termuijs/core').Color;
    /** Badge color */
    badgeColor?: import('@termuijs/core').Color;
}

/**
 * Sidebar — a vertical list of navigation items with optional badges.
 *
 * Supports active item highlighting and collapsible mode.
 */
export class Sidebar extends Widget {
    private _items: SidebarItem[];
    private _collapsed: boolean;
    private _collapsedWidth: number;
    private _activeColor: import('@termuijs/core').Color;
    private _badgeColor: import('@termuijs/core').Color;

    constructor(items: SidebarItem[], style: Partial<Style> = {}, opts: SidebarOptions = {}) {
        super(style);
        this._items = items;
        this._collapsed = opts.collapsed ?? false;
        this._collapsedWidth = opts.collapsedWidth ?? 3;
        this._activeColor = opts.activeColor ?? { type: 'named', name: 'cyan' };
        this._badgeColor = opts.badgeColor ?? { type: 'named', name: 'yellow' };
    }

    setItems(items: SidebarItem[]): void {
        this._items = items;
        this.markDirty();
    }

    setCollapsed(collapsed: boolean): void {
        this._collapsed = collapsed;
        this.markDirty();
    }

    toggle(): void {
        this._collapsed = !this._collapsed;
        this.markDirty();
    }

    get isCollapsed(): boolean { return this._collapsed; }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        for (let i = 0; i < this._items.length && i < height; i++) {
            const item = this._items[i];
            if (!item) continue;

            const isActive = item.active ?? false;
            const fg = isActive ? this._activeColor : attrs.fg;

            if (this._collapsed) {
                // Collapsed: show first character of label only
                const char = item.label.charAt(0) || ' ';
                screen.writeString(x, y + i, char, { ...attrs, fg, bold: isActive });
            } else {
                // Active indicator
                const prefix = isActive ? '▶ ' : '  ';
                const prefixWidth = stringWidth(prefix);

                screen.writeString(x, y + i, prefix, { ...attrs, fg });

                // Label
                const badgeText = item.badge ? ` [${item.badge}]` : '';
                const badgeWidth = stringWidth(badgeText);
                const labelWidth = Math.max(0, width - prefixWidth - badgeWidth);
                const label = item.label.slice(0, labelWidth);

                screen.writeString(x + prefixWidth, y + i, label, {
                    ...attrs,
                    fg,
                    bold: isActive,
                });

                // Badge
                if (item.badge && badgeWidth > 0) {
                    const badgeX = x + width - badgeWidth;
                    screen.writeString(badgeX, y + i, badgeText, {
                        ...attrs,
                        fg: this._badgeColor,
                    });
                }
            }
        }
    }
}
