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

        // Left
        screen.writeString(
            x,
            y,
            truncate(this._left, width),
            attrs,
        );

        // Center
        const centerX = x + Math.max(
            0,
            Math.floor((width - stringWidth(this._center)) / 2),
        );

        screen.writeString(
            centerX,
            y,
            truncate(this._center, width),
            attrs,
        );

        // Right
        const rightWidth = stringWidth(this._right);
        const rightX = Math.max(x, x + width - rightWidth);

        screen.writeString(
            rightX,
            y,
            truncate(this._right, width),
            attrs,
        );
    }
}