import { type Screen, type Style, styleToCellAttrs, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface EmptyStateOptions {
    icon?: string;
    description?: string;
    hint?: string;
}

export class EmptyState extends Widget {
    private _title: string;
    private _icon: string;
    private _description: string = '';
    private _hint: string = '';

    constructor(title: string, style: Partial<Style> = {}, opts: EmptyStateOptions = {}) {
        super(style);
        this._title = title;
        this._icon = opts.icon ?? (caps.unicode ? '📭' : '[]');
        if (opts.description !== undefined) this._description = opts.description;
        if (opts.hint !== undefined) this._hint = opts.hint;
    }

    setTitle(title: string): void {
        if (this._title === title) return;

        this._title = title;
        this.markDirty();
    }

    setDescription(description: string): void {
        if (this._description === description) return;

        this._description = description;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const hasHint = this._hint.length > 0;
        const hasDesc = this._description.length > 0;

        const hintRow = hasHint ? y + height - 1 : -1;
        const mainHeight = hasHint ? height - 1 : height;

        const contentLines = 1 + 1 + (hasDesc ? 1 : 0);
        const startRow = y + Math.max(0, Math.floor((mainHeight - contentLines) / 2));

        const iconX = x + Math.max(0, Math.floor((width - stringWidth(this._icon)) / 2));
        screen.writeString(iconX, startRow, this._icon, attrs);

        const titleStr = this._title;
        const titleX = x + Math.max(0, Math.floor((width - stringWidth(titleStr)) / 2));
        screen.writeString(titleX, startRow + 1, titleStr, { ...attrs, bold: true });

        if (hasDesc) {
            const descStr = this._description;
            const descX = x + Math.max(0, Math.floor((width - stringWidth(descStr)) / 2));
            screen.writeString(descX, startRow + 2, descStr, { ...attrs, dim: true });
        }

        if (hasHint) {
            const hintStr = this._hint;
            const hintX = x + Math.max(0, Math.floor((width - stringWidth(hintStr)) / 2));
            screen.writeString(hintX, hintRow, hintStr, { ...attrs, dim: true });
        }
    }
}
