import { Widget } from '../base/Widget.js';
import { type Style, type Color, type Screen, caps, styleToCellAttrs, parseColor, stringWidth } from '@termuijs/core';

export interface LinkOptions {
    /** The target URL for the OSC 8 hyperlink anchor. */
    url: string;
    /** Underline and anchor fallback color object. Default: blue */
    color?: Color;
    /** Whether to append the URL visually when terminal capabilities lack unicode/OSC 8 support. Default: true */
    showUrlFallback?: boolean;
}

export class Link extends Widget {
    private _text: string;
    private _url: string;
    private _color: Color;
    private _showUrlFallback: boolean;

    // Fixed constructor mapping: opts is now required to prevent missing URL type errors
    constructor(text: string, style: Partial<Style> | undefined, opts: LinkOptions) {
        super(style);
        
        this._text = text;
        this._url = opts.url;
        this._color = opts.color ?? parseColor('blue');
        this._showUrlFallback = opts.showUrlFallback ?? true;
    }

    public setText(text: string): void {
        if (this._text !== text) {
            this._text = text;
            this.markDirty();
        }
    }

    public setUrl(url: string): void {
        if (this._url !== url) {
            this._url = url;
            this.markDirty();
        }
    }

    /**
     * Helper to safely slice text based on its visible terminal cell width grid blocks
     */
    private _sliceByWidth(str: string, maxWidth: number): string {
        let currentWidth = 0;
        let result = '';
        for (const char of str) {
            const charWidth = stringWidth(char);
            if (currentWidth + charWidth > maxWidth) {
                break;
            }
            result += char;
            currentWidth += charWidth;
        }
        return result;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        if (rect.width <= 0 || rect.height <= 0) {
            return;
        }

        let targetText = this._text;
        let cellLinkTarget: string | undefined = undefined;

        // 1. If terminal environment supports modern capabilities, set the metadata link directly
        if (caps.unicode) {
            cellLinkTarget = this._url;
            if (stringWidth(targetText) > rect.width) {
                targetText = this._sliceByWidth(targetText, rect.width);
            }
        } 
        // 2. Fallback execution layout block for legacy or raw non-unicode terminal windows
        else if (this._showUrlFallback && this._url) {
            const fallbackSuffix = ` (${this._url})`;
            if (stringWidth(targetText + fallbackSuffix) > rect.width) {
                const availableWidthForText = rect.width - stringWidth(fallbackSuffix);
                targetText = availableWidthForText > 0 
                    ? this._sliceByWidth(targetText, availableWidthForText) + fallbackSuffix
                    : this._sliceByWidth(fallbackSuffix, rect.width);
            } else {
                targetText = targetText + fallbackSuffix;
            }
        } else {
            if (stringWidth(targetText) > rect.width) {
                targetText = this._sliceByWidth(targetText, rect.width);
            }
        }

        const cellAttrs = styleToCellAttrs({
            underline: true,
            fg: this._color,
            ...this.style,
        });

        // screen.writeString will map this property directly to cell.link without breaking string widths!
        screen.writeString(rect.x, rect.y, targetText, {
            ...cellAttrs,
            link: cellLinkTarget
        });
    }
}
