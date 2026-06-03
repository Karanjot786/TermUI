// ─────────────────────────────────────────────────────
// @termuijs/widgets — Timeline widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type TimelineStatus = 'done' | 'active' | 'pending';

export interface TimelineItem {
    title: string;
    time?: string;
    status?: TimelineStatus;
}

/**
 * Timeline — renders a vertical list of timeline items.
 *
 * Each item gets a connector (├─ / └─) and a status icon:
 *   ● active (cyan/bold), ✓ done (green), ○ pending (dim).
 */
export class Timeline extends Widget {
    private _items: TimelineItem[];

    constructor(
        items: TimelineItem[],
        style: Partial<Style> = {},
    ) {
        super(style);
        this._items = items;
    }

    setItems(items: TimelineItem[]): void {
        this._items = items;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._items.length === 0) return;

        const attrs = styleToCellAttrs(this._style);
        const visibleCount = Math.min(this._items.length, height);

        for (let i = 0; i < visibleCount; i++) {
            const item = this._items[i];
            const isLast = i === this._items.length - 1;
            const status = item.status ?? 'pending';

            let connector: string;
            if (isLast) {
                connector = '\u2514\u2500'; // └─
            } else {
                connector = '\u251C\u2500'; // ├─
            }

            let icon: string;
            if (caps.unicode) {
                switch (status) {
                    case 'active':
                        icon = '\u25CF'; // ●
                        break;
                    case 'done':
                        icon = '\u2713'; // ✓
                        break;
                    default:
                        icon = '\u25CB'; // ○
                        break;
                }
            } else {
                switch (status) {
                    case 'done':
                        icon = 'v';
                        break;
                    default:
                        icon = 'o';
                        break;
                }
            }

            const isActive = status === 'active';
            const isDone = status === 'done';
            const isPending = status === 'pending';

            const statusColor: Color = isDone
                ? { type: 'named', name: 'green' }
                : isActive
                    ? { type: 'named', name: 'cyan' }
                    : { type: 'named', name: 'white' };

            // Connector + icon portion: e.g. "├─ ● "
            const iconX = x + connector.length;
            const titleX = iconX + 2;

            screen.writeString(x, y + i, connector, {
                ...attrs,
                fg: statusColor,
                bold: isActive,
                dim: isPending,
            });

            screen.setCell(iconX, y + i, {
                char: icon,
                fg: statusColor,
                bold: isActive,
                dim: isPending,
            });

            screen.writeString(titleX, y + i, item.title, {
                ...attrs,
                bold: isActive,
                dim: isPending,
            });

            // Time — dimmed right-aligned
            if (item.time) {
                const timeStr = ` ${item.time}`;
                const timeX = x + width - timeStr.length;
                if (timeX > titleX) {
                    screen.writeString(timeX, y + i, timeStr, {
                        ...attrs,
                        dim: true,
                    });
                }
            }
        }
    }
}
