// ─────────────────────────────────────────────────────
// @termuijs/widgets — Avatar widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface AvatarOptions {
    /** Override the dynamically generated color */
    color?: Color;
    /** Shape of the avatar */
    shape?: 'square' | 'circle';
}

/**
 * Avatar — a widget that displays user initials with a generated color.
 */
export class Avatar extends Widget {
    private _name: string;
    private _color?: Color;
    private _shape: 'square' | 'circle';
    private _initials: string;
    private _fallbackColor: Color;

    constructor(name: string, style: Partial<Style> = {}, opts: AvatarOptions = {}) {
        super(style);
        this._name = name;
        this._color = opts.color;
        this._shape = opts.shape ?? 'square';
        this._initials = this._extractInitials(name);
        this._fallbackColor = this._generateColor(name);
    }

    setName(name: string): void {
        this._name = name;
        this._initials = this._extractInitials(name);
        this._fallbackColor = this._generateColor(name);
        this.markDirty();
    }

    getName(): string {
        return this._name;
    }

    setColor(color: Color): void {
        this._color = color;
        this.markDirty();
    }

    getColor(): Color | undefined {
        return this._color;
    }

    setShape(shape: 'square' | 'circle'): void {
        this._shape = shape;
        this.markDirty();
    }

    getShape(): 'square' | 'circle' {
        return this._shape;
    }

    private _extractInitials(name: string): string {
        if (!name) return '';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 0 || parts[0] === '') return '';
        let init = '';
        if (parts.length === 1) {
            init = parts[0].substring(0, 2).toUpperCase();
        } else {
            init = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        if (!caps.unicode) {
            init = init.replace(/[^\x00-\x7F]/g, '?');
        }
        return init;
    }

    private _generateColor(name: string): Color {
        if (!name) {
            return { type: 'named', name: 'white' };
        }
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Stable palette of colors
        const colors = [
            'red', 'green', 'yellow', 'blue', 'magenta', 'cyan',
            'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan'
        ] as const;
        
        const index = Math.abs(hash) % colors.length;
        return { type: 'named', name: colors[index] };
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const avatarColor = this._color ?? this._fallbackColor;

        let text = '';
        if (this._shape === 'circle') {
            text = `(${this._initials})`;
        } else {
            text = `[${this._initials}]`;
        }

        let renderText = '';
        let currentWidth = 0;
        for (const char of text) {
            const cw = stringWidth(char);
            if (currentWidth + cw > width) break;
            currentWidth += cw;
            renderText += char;
        }

        screen.writeString(x, y, renderText, {
            ...attrs,
            fg: avatarColor,
            bold: true,
        });
    }
}
