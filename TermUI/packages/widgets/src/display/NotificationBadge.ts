// @termuijs/widgets - NotificationBadge widget

import { type Screen, type Style, type Color, stringWidth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type BadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface NotificationBadgeOptions {
    /** Notification count to display. Default: 0. */
    count?: number;
    /** Corner position for the badge. Default: 'top-right'. */
    position?: BadgePosition;
}

/** Badge background: red, the universal notification color. */
const BADGE_BG: Color = { type: 'named', name: 'red' };

/** Badge foreground: white for contrast on red. */
const BADGE_FG: Color = { type: 'named', name: 'white' };

/**
 * NotificationBadge - a small count label rendered at a corner position.
 *
 * Used for unread counts, alert indicators, and notification overlays.
 * Renders the count as a compact colored label at one of four corner positions.
 * Shows "99+" when the count exceeds 99. Renders nothing when count is 0.
 */
export class NotificationBadge extends Widget {
    private _count: number;
    private _position: BadgePosition;

    constructor(opts: NotificationBadgeOptions = {}, style: Partial<Style> = {}) {
        super(style);
        this._count = opts.count ?? 0;
        this._position = opts.position ?? 'top-right';
    }

    /** Update the notification count. */
    setCount(count: number): void {
        this._count = count;
        this.markDirty();
    }

    /** Get the current notification count. */
    getCount(): number {
        return this._count;
    }

    /** Update the badge position. */
    setPosition(position: BadgePosition): void {
        this._position = position;
        this.markDirty();
    }

    /** Get the current badge position. */
    getPosition(): BadgePosition {
        return this._position;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        // Show nothing when count is zero
        if (this._count === 0) return;

        // Format the label: "99+" for counts over 99
        const label = this._count > 99 ? '99+' : String(this._count);
        const labelWidth = stringWidth(label);

        // Compute badge position based on corner setting
        let bx: number;
        let by: number;

        switch (this._position) {
            case 'top-left':
                bx = x;
                by = y;
                break;
            case 'top-right':
                bx = x + width - labelWidth;
                by = y;
                break;
            case 'bottom-left':
                bx = x;
                by = y + height - 1;
                break;
            case 'bottom-right':
                bx = x + width - labelWidth;
                by = y + height - 1;
                break;
        }

        // Clamp to widget bounds
        bx = Math.max(x, bx);

        // Render the label with notification colors
        const attrs = { fg: BADGE_FG, bg: BADGE_BG, bold: true };
        screen.writeString(bx, by, label, attrs);
    }
}
