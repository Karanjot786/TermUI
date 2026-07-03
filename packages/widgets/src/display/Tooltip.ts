// @termuijs/widgets — Tooltip widget

import {
    type Screen,
    type Style,
    caps,
    prefersReducedMotion,
    styleToCellAttrs,
} from '@termuijs/core';
import { fadeIn, fadeOut } from '@termuijs/motion';
import { Widget } from '../base/Widget.js';

export interface TooltipOptions {
    text: string;
    visible: boolean;
}

/**
 * Tooltip — displays contextual help text.
 *
 * The widget renders within its own assigned rect.
 * The parent is responsible for positioning it via updateRect().
 *
 * On show/hide the tooltip plays a short fade-in/fade-out animation
 * (150ms) using the terminal's `dim` attribute to simulate opacity.
 * The animation is skipped when prefersReducedMotion() is true.
 */
export class Tooltip extends Widget {
    private _text: string;
    private _visible: boolean;
    private _animOpacity: number;
    private _animCancel?: () => void;

    constructor(options: TooltipOptions, style: Partial<Style> = {}) {
        super(style);

        this._text = options.text;
        this._visible = options.visible;
        this._animOpacity = options.visible ? 1 : 0;
    }

    mount(): void {
        super.mount();
        if (this._visible && this._animOpacity < 1) {
            this._animOpacity = 1;
            this.markDirty();
        }
    }

    unmount(): void {
        this._animCancel?.();
        this._animCancel = undefined;
        super.unmount();
    }

    protected _renderSelf(screen: Screen): void {
        if (this._animOpacity <= 0) return;

        const { x, y, width, height } = this._rect;

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs({
            ...this._style,
            dim: this._animOpacity < 0.5,
        });

        const tl = caps.unicode ? '┌' : '+';
        const tr = caps.unicode ? '┐' : '+';
        const bl = caps.unicode ? '└' : '+';
        const br = caps.unicode ? '┘' : '+';
        const hz = caps.unicode ? '─' : '-';
        const vt = caps.unicode ? '│' : '|';

        // Top border
        screen.setCell(x, y, { char: tl, ...attrs });

        for (let c = 1; c < width - 1; c++) {
            screen.setCell(x + c, y, { char: hz, ...attrs });
        }

        if (width > 1) {
            screen.setCell(x + width - 1, y, { char: tr, ...attrs });
        }

        // Content row
        if (height >= 2) {
            screen.setCell(x, y + 1, { char: vt, ...attrs });

            const content = this._text
                .slice(0, Math.max(0, width - 2))
                .padEnd(Math.max(0, width - 2), ' ');

            screen.writeString(x + 1, y + 1, content, attrs);

            if (width > 1) {
                screen.setCell(x + width - 1, y + 1, { char: vt, ...attrs });
            }
        }

        // Bottom border
        if (height >= 3) {
            screen.setCell(x, y + height - 1, { char: bl, ...attrs });

            for (let c = 1; c < width - 1; c++) {
                screen.setCell(x + c, y + height - 1, { char: hz, ...attrs });
            }

            if (width > 1) {
                screen.setCell(x + width - 1, y + height - 1, {
                    char: br,
                    ...attrs,
                });
            }
        }
    }

    setText(text: string): void {
        if (this._text === text) return;
        this._text = text;
        this.markDirty();
    }

    getText(): string {
        return this._text;
    }

    setVisible(visible: boolean): void {
        if (this._visible === visible) return;

        this._animCancel?.();

        if (visible) {
            this._visible = true;
            this._animOpacity = 0;
            this.markDirty();

            if (prefersReducedMotion()) {
                this._animOpacity = 1;
                return;
            }

            this._animCancel = fadeIn(150, (opacity) => {
                this._animOpacity = opacity;
                this.markDirty();
            }, () => {
                this._animOpacity = 1;
                this._animCancel = undefined;
            });
        } else {
            this._visible = false;
            this.markDirty();

            if (prefersReducedMotion()) {
                this._animOpacity = 0;
                return;
            }

            this._animCancel = fadeOut(150, (opacity) => {
                this._animOpacity = opacity;
                this.markDirty();
            }, () => {
                this._animOpacity = 0;
                this._animCancel = undefined;
            });
        }
    }

    getVisible(): boolean {
        return this._visible;
    }
}
