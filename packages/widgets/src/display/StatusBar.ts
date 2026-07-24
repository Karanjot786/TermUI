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
