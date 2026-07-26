import { Widget, Text } from '@termuijs/widgets';
import { type App, type Style, type Rect, mergeStyles, defaultStyle, styleToCellAttrs, stringWidth } from '@termuijs/core';

export interface TooltipOverlayOptions {
    app: App;
    style?: Partial<Style>;
}

export class TooltipOverlay extends Widget {
    private _app: App;
    private _visible = false;
    private _textWidget: Text | null = null;
    private _tooltipX = 0;
    private _tooltipY = 0;

    constructor(options: TooltipOverlayOptions) {
        // High zIndex to appear over everything
        super(mergeStyles(defaultStyle(), { zIndex: 2000, overflow: 'visible', ...options.style }));
        this._app = options.app;
        
        // Listen to the global tooltip state
        this._app.tooltip.events.on('change', (state) => {
            if (state) {
                this._open(state.text, state.x, state.y);
            } else {
                this._close();
            }
        });
    }

    private _open(text: string, x: number, y: number): void {
        this._visible = true;
        
        if (!this._textWidget) {
            this._textWidget = new Text(text, {
                fg: (this.style.fg || 'black') as any,
                bg: (this.style.bg || 'yellow') as any,
            });
            this.addChild(this._textWidget);
        } else {
            this._textWidget.setContent(text);
        }

        // Calculate max width based on text using stringWidth to properly account for graphemes
        let w = stringWidth(text);
        const h = 1;

        // Prevent overflow on screen edges
        const screenW = this._app.screen.cols;
        const screenH = this._app.screen.rows;

        this._tooltipX = x + w > screenW ? screenW - w : x;
        this._tooltipY = y + h > screenH ? Math.max(0, screenH - h) : y;
        
        this.updateRect({ x: this._tooltipX, y: this._tooltipY, width: w, height: h });
        this._textWidget.updateRect({ x: this._tooltipX, y: this._tooltipY, width: w, height: h });
        
        this.markDirty();
    }

    private _close(): void {
        this._visible = false;
        if (this._textWidget) {
            this._children = this._children.filter(c => c !== this._textWidget);
            this._textWidget = null;
        }
        this.updateRect({ x: 0, y: 0, width: 0, height: 0 });
        this.markDirty();
    }

    protected _renderSelf(screen: typeof this._app.screen): void {
        if (!this._visible || !this._textWidget) return;

        // Render the tooltip background manually since Widget's border logic expects width/height > 1 usually
        const attrs = styleToCellAttrs({
            fg: (this.style.fg || 'black') as any,
            bg: (this.style.bg || 'yellow') as any
        });

        const r = this._textWidget.rect;
        for (let x = r.x; x < r.x + r.width; x++) {
            if (x >= 0 && x < screen.cols && r.y >= 0 && r.y < screen.rows) {
                screen.setCell(x, r.y, { char: ' ', ...attrs });
            }
        }
    }
}
