import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type Rect,
    type MouseEvent as TermMouseEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    getBorderChars,
    caps,
} from '@termuijs/core';

export interface WindowOptions {
    title?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    draggable?: boolean;
    resizable?: boolean;
    minimizable?: boolean;
    maximizable?: boolean;
    closable?: boolean;
}

export class Window extends Widget {
    public windowX: number;
    public windowY: number;
    public windowWidth: number;
    public windowHeight: number;

    private _title: string;
    private _minWidth: number;
    private _minHeight: number;
    private _draggable: boolean;
    private _resizable: boolean;
    private _minimizable: boolean;
    private _maximizable: boolean;
    private _closable: boolean;

    public isMinimized = false;
    public isMaximized = false;
    public isClosed = false;

    // Track original bounds before maximization
    private _prevX = 0;
    private _prevY = 0;
    private _prevWidth = 0;
    private _prevHeight = 0;

    constructor(options: WindowOptions = {}, style?: Partial<Style>) {
        // Set visible border style to none because we will draw the border manually in _renderSelf
        super(
            mergeStyles(
                defaultStyle(),
                {
                    border: 'none',
                    padding: { top: 0, bottom: 0, left: 0, right: 0 },
                    ...style,
                }
            )
        );

        this.windowX = options.x ?? 0;
        this.windowY = options.y ?? 0;
        this.windowWidth = options.width ?? 30;
        this.windowHeight = options.height ?? 10;
        this._title = options.title ?? '';
        this._minWidth = options.minWidth ?? 15;
        this._minHeight = options.minHeight ?? 5;
        this._draggable = options.draggable ?? true;
        this._resizable = options.resizable ?? true;
        this._minimizable = options.minimizable ?? true;
        this._maximizable = options.maximizable ?? true;
        this._closable = options.closable ?? true;
    }

    get title(): string {
        return this._title;
    }

    set title(value: string) {
        this._title = value;
        this.markDirty();
    }

    get draggable(): boolean {
        return this._draggable;
    }

    get resizable(): boolean {
        return this._resizable;
    }

    get minWidth(): number {
        return this._minWidth;
    }

    get minHeight(): number {
        return this._minHeight;
    }

    minimize(): void {
        this.isMinimized = !this.isMinimized;
        this.markDirty();
    }

    maximize(): void {
        if (!this.isMaximized) {
            // Save state
            this._prevX = this.windowX;
            this._prevY = this.windowY;
            this._prevWidth = this.windowWidth;
            this._prevHeight = this.windowHeight;
            this.isMaximized = true;
        } else {
            this.windowX = this._prevX;
            this.windowY = this._prevY;
            this.windowWidth = this._prevWidth;
            this.windowHeight = this._prevHeight;
            this.isMaximized = false;
        }
        this.markDirty();
    }

    close(): void {
        this.isClosed = true;
        this.setStyle({ visible: false });
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    /**
     * Expose content area details for layout calculation.
     */
    getContentRect(): Rect {
        const { x, y, width, height } = this._rect;
        const currentHeight = this.isMinimized ? 1 : height;
        return {
            x: x + 1,
            y: y + 2,
            width: Math.max(0, width - 2),
            height: Math.max(0, currentHeight - 3),
        };
    }

    /**
     * Checks if a mouse click targets a control button in the title bar.
     * Returns: 'minimize' | 'maximize' | 'close' | 'title' | null
     */
    getClickTarget(localX: number, localY: number): 'minimize' | 'maximize' | 'close' | 'title' | null {
        if (localY !== 0) return null;

        const w = this._rect.width;
        let rightOffset = w - 2;

        if (this._closable) {
            if (localX === rightOffset) return 'close';
            rightOffset -= 2;
        }
        if (this._maximizable) {
            if (localX === rightOffset) return 'maximize';
            rightOffset -= 2;
        }
        if (this._minimizable) {
            if (localX === rightOffset) return 'minimize';
        }

        if (localX >= 1 && localX < w - 1) {
            return 'title';
        }

        return null;
    }

    protected _renderSelf(screen: Screen): void {
        if (this.isClosed) return;

        const { x, y, width, height } = this._rect;
        const currentHeight = this.isMinimized ? 1 : height;
        if (width < 2 || currentHeight < 1) return;

        const useUnicode = caps.unicode;
        const borderChars = getBorderChars('single', undefined, !useUnicode);
        if (!borderChars) return;

        const cellAttrs = styleToCellAttrs(this.style);
        
        // Highlight active/focused window borders
        const borderColor = this.isFocused
            ? (this.style.focusRingColor ?? { type: 'named', name: 'cyan' })
            : (this.style.borderColor ?? cellAttrs.fg);

        const borderStyle = { ...cellAttrs, fg: borderColor };

        // 1. Draw Title Bar / Top Border
        screen.setCell(x, y, { char: borderChars.topLeft, ...borderStyle });
        for (let col = 1; col < width - 1; col++) {
            screen.setCell(x + col, y, { char: borderChars.top, ...borderStyle });
        }
        screen.setCell(x + width - 1, y, { char: borderChars.topRight, ...borderStyle });

        // Draw title text
        let titleText = this._title;
        if (titleText) {
            titleText = ` ${titleText} `;
            const maxTitleLen = width - 10;
            if (titleText.length > maxTitleLen) {
                titleText = titleText.slice(0, Math.max(3, maxTitleLen)) + '…';
            }
            screen.writeString(x + 2, y, titleText, {
                ...borderStyle,
                bold: this.isFocused,
            });
        }

        // Draw window controls
        let controlOffset = width - 2;
        if (this._closable) {
            screen.writeString(x + controlOffset, y, '×', { ...borderStyle, bold: true });
            controlOffset -= 2;
        }
        if (this._maximizable) {
            screen.writeString(x + controlOffset, y, this.isMaximized ? '⧉' : '▢', borderStyle);
            controlOffset -= 2;
        }
        if (this._minimizable) {
            screen.writeString(x + controlOffset, y, '_', borderStyle);
        }

        if (this.isMinimized) {
            return; // Don't render body if minimized
        }

        // 2. Draw Sides and Background
        const bodyBgStyle = { ...cellAttrs };
        for (let row = 1; row < height - 1; row++) {
            screen.setCell(x, y + row, { char: borderChars.left, ...borderStyle });
            screen.writeString(x + 1, y + row, ' '.repeat(width - 2), bodyBgStyle);
            screen.setCell(x + width - 1, y + row, { char: borderChars.right, ...borderStyle });
        }

        // 3. Draw Bottom Border
        screen.setCell(x, y + height - 1, { char: borderChars.bottomLeft, ...borderStyle });
        for (let col = 1; col < width - 1; col++) {
            screen.setCell(x + col, y + height - 1, { char: borderChars.bottom, ...borderStyle });
        }
        screen.setCell(x + width - 1, y + height - 1, { char: borderChars.bottomRight, ...borderStyle });

        // Draw content area children
        const contentRect = this.getContentRect();
        for (const child of this._children) {
            child.updateRect(contentRect);
            child.render(screen);
        }
    }
}
