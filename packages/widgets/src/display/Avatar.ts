import { Widget } from '../base/Widget.js';
import { type Style, type Color, type Screen, caps } from '@termuijs/core';

export interface AvatarOptions {
    /** Background color of the avatar box */
    bgColor?: Color;
    /** Foreground color of the initials/icon */
    fgColor?: Color;
    /** Border style. Default: 'single' */
    border?: 'none' | 'single' | 'double' | 'rounded';
}

const BORDER_CHARS = {
    single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
    double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
    rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
    ascii:  { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' }
};

export class Avatar extends Widget {
    private _initials: string;
    private _opts: AvatarOptions;

    // Notice the specific parameter order based on your API contract
    constructor(initials: string, style?: Partial<Style>, opts?: AvatarOptions) {
        super(style);
        this._opts = { border: 'single', ...opts };
        this._initials = initials.substring(0, 2);
    }

    public setInitials(initials: string): void {
        this._initials = initials.substring(0, 2);
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        
        if (width <= 0 || height <= 0) return;

        const attrs: { fg?: Color; bg?: Color } = {};
        if (this._opts.fgColor) attrs.fg = this._opts.fgColor;
        if (this._opts.bgColor) attrs.bg = this._opts.bgColor;

        const borderStyle = this._opts.border || 'single';
        const hasBorder = borderStyle !== 'none';
        
        let bType = BORDER_CHARS.ascii;
        if (caps.unicode && borderStyle !== 'none') {
            bType = BORDER_CHARS[borderStyle];
        }

        // 1. Draw Background and Borders First
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                let char = ' ';
                let isBorder = false;

                if (hasBorder) {
                    if (dy === 0 && dx === 0) { char = bType.tl; isBorder = true; }
                    else if (dy === 0 && dx === width - 1) { char = bType.tr; isBorder = true; }
                    else if (dy === height - 1 && dx === 0) { char = bType.bl; isBorder = true; }
                    else if (dy === height - 1 && dx === width - 1) { char = bType.br; isBorder = true; }
                    else if (dy === 0 || dy === height - 1) { char = bType.h; isBorder = true; }
                    else if (dx === 0 || dx === width - 1) { char = bType.v; isBorder = true; }
                }

                // Only render cells that have a border, or if we have a background fill color
                if (isBorder || attrs.bg) {
                    screen.setCell(x + dx, y + dy, { char, ...attrs });
                }
            }
        }

        // 2. Draw Initials Centered over the Background
        if (this._initials) {
            const textLen = this._initials.length;
            const centerX = Math.floor((width - textLen) / 2);
            const centerY = Math.floor(height / 2);

            // Ensure we don't draw outside the widget bounds
            if (centerX >= 0 && centerY >= 0 && centerX + textLen <= width && centerY < height) {
                screen.writeString(x + centerX, y + centerY, this._initials, attrs);
            }
        }
    }
}