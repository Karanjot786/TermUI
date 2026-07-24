// ─────────────────────────────────────────────────────
// @termuijs/widgets — StatusBar widget
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    styleToCellAttrs,
    truncate,
    stringWidth,
} from '@termuijs/core';

import { Widget } from '../base/Widget.js';

export interface StatusBarOptions {
    left?: string;
    center?: string;
    right?: string;
}

export interface ApiStatusBarOptions {
    method?: string;
    endpoint?: string;
    status?: number | string;
    latencyMs?: number;
    environment?: string;
    requestId?: string;
}

export class StatusBar extends Widget {
    private _left: string;
    private _center: string;
    private _right: string;

    constructor(
        style: Partial<Style> = {},
        options: StatusBarOptions = {},
    ) {
        super(style);

        this._left = options.left ?? '';
        this._center = options.center ?? '';
        this._right = options.right ?? '';
    }

    setLeft(text: string): void {
        this._left = text;
        this.markDirty();
    }

    setCenter(text: string): void {
        this._center = text;
        this.markDirty();
    }

    setRight(text: string): void {
        this._right = text;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        const rightText = truncate(this._right, width);
        const rightWidth = stringWidth(rightText);
        const rightX = x + width - rightWidth;

        const centerAvailable = Math.max(0, rightX - x);
        const centerText = truncate(this._center, centerAvailable);
        const centerWidth = stringWidth(centerText);
        const desiredCenterX = x + Math.floor((width - centerWidth) / 2);
        const centerX = Math.max(
            x,
            Math.min(desiredCenterX, rightX - centerWidth),
        );

        const leftAvailable = centerWidth > 0
            ? Math.max(0, centerX - x)
            : Math.max(0, rightX - x);
        const leftText = truncate(this._left, leftAvailable);

        if (leftText) {
            screen.writeString(x, y, leftText, attrs);
        }

        if (centerText) {
            screen.writeString(centerX, y, centerText, attrs);
        }

        if (rightText) {
            screen.writeString(rightX, y, rightText, attrs);
        }
    }
}

export function createApiStatusBar(
    options: ApiStatusBarOptions,
    style: Partial<Style> = {},
): StatusBar {
    return new StatusBar(style, formatApiStatusBar(options));
}

export function formatApiStatusBar(options: ApiStatusBarOptions): StatusBarOptions {
    const method = options.method?.trim().toUpperCase();
    const endpoint = options.endpoint?.trim();
    const status = options.status;
    const latencyMs = options.latencyMs;

    const left = [method, endpoint].filter(Boolean).join(' ') || 'API';
    const center = status === undefined ? 'Pending' : formatStatus(status);
    const right = [
        latencyMs === undefined ? undefined : `${Math.max(0, Math.round(latencyMs))}ms`,
        options.environment?.trim(),
        options.requestId ? `#${options.requestId.trim()}` : undefined,
    ].filter(Boolean).join(' ');

    return { left, center, right };
}

function formatStatus(status: number | string): string {
    if (typeof status === 'number') {
        if (status >= 200 && status < 300) return `${status} OK`;
        if (status >= 300 && status < 400) return `${status} Redirect`;
        if (status >= 400 && status < 500) return `${status} Client Error`;
        if (status >= 500) return `${status} Server Error`;
        return String(status);
    }

    return status.trim() || 'Pending';
}
