// AppShell — full-screen application layout
import { Widget } from '@termuijs/widgets';
import { type Screen, type Rect, type LayoutNode, type KeyEvent, createLayoutNode, mergeStyles, defaultStyle } from '@termuijs/core';

export interface AppShellOptions {
    header?: Widget;
    footer?: Widget;
    sidebar?: Widget;
    main: Widget;
    sidebarWidth?: number;
}

export class AppShell extends Widget {
    private _header?: Widget;
    private _footer?: Widget;
    private _sidebar?: Widget;
    private _main: Widget;
    private _sidebarWidth: number;
    private _sidebarVisible = true;
    private _mainScrollOffset = 0;

    constructor(options: AppShellOptions) {
        super(mergeStyles(defaultStyle(), { width: '100%', height: '100%', overflow: 'hidden' }));
        this._header = options.header;
        this._footer = options.footer;
        this._sidebar = options.sidebar;
        this._main = options.main;
        this._sidebarWidth = Math.max(0, Math.floor(options.sidebarWidth ?? 20));
    }

    get sidebarVisible(): boolean {
        return this._sidebarVisible;
    }

    override getLayoutNode(): LayoutNode {
        return createLayoutNode(this.id, this.style, []);
    }

    override updateRect(rect: Rect): void {
        const changed =
            rect.x !== this.rect.x ||
            rect.y !== this.rect.y ||
            rect.width !== this.rect.width ||
            rect.height !== this.rect.height;
        super.updateRect(rect);
        if (changed) this.markDirty();
    }

    handleResize(cols: number, rows: number): void {
        this.updateRect({ x: 0, y: 0, width: cols, height: rows });
        this.markDirty();
    }

    scrollUp(lines = 1): void {
        this._mainScrollOffset = Math.max(0, this._mainScrollOffset - lines);
        this.markDirty();
    }

    scrollDown(lines = 1): void {
        this._mainScrollOffset += lines;
        this._clampMainScroll();
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'ArrowUp':
                this.scrollUp();
                break;
            case 'ArrowDown':
                this.scrollDown();
                break;
        }
    }

    toggleSidebar(): void {
        this._sidebarVisible = !this._sidebarVisible;
        this._clampMainScroll();
        this.markDirty();
    }

    protected _renderSelf(_screen: Screen): void {
        // Container only
    }

    override render(screen: Screen): void {
        if (this.style.visible === false) return;

        const nextRect = { x: 0, y: 0, width: screen.cols, height: screen.rows };
        if (
            this.rect.x !== nextRect.x ||
            this.rect.y !== nextRect.y ||
            this.rect.width !== nextRect.width ||
            this.rect.height !== nextRect.height
        ) {
            super.updateRect(nextRect);
        }

        const shouldClip = this.style.overflow !== 'visible';
        if (shouldClip) screen.pushClip(this.rect);

        const { x, y, width, height } = this.rect;
        const headerHeight = this._header ? 1 : 0;
        const footerHeight = this._footer ? 1 : 0;
        const bodyY = y + headerHeight;
        const bodyHeight = Math.max(0, height - headerHeight - footerHeight);

        this._renderFixedChild(this._header, screen, { x, y, width, height: headerHeight });
        this._renderFooter(screen, x, y, width, height, footerHeight);

        const sidebarWidth = this._sidebar && this._sidebarVisible
            ? Math.min(this._sidebarWidth, width)
            : 0;
        const mainX = x + sidebarWidth;
        const mainWidth = Math.max(0, width - sidebarWidth);
        const mainContentHeight = Math.max(bodyHeight, this._main.rect.height || 0);
        this._clampMainScroll(bodyHeight, mainContentHeight);

        if (sidebarWidth > 0 && bodyHeight > 0) {
            this._renderFixedChild(this._sidebar, screen, {
                x,
                y: bodyY,
                width: sidebarWidth,
                height: bodyHeight,
            });
        }

        if (mainWidth > 0 && bodyHeight > 0) {
            const originalRect = { ...this._main.rect };
            this._main.updateRect({
                x: mainX,
                y: bodyY - this._mainScrollOffset,
                width: mainWidth,
                height: mainContentHeight,
            });
            screen.pushClip({ x: mainX, y: bodyY, width: mainWidth, height: bodyHeight });
            try {
                this._main.render(screen);
            } finally {
                screen.popClip();
                this._main.updateRect(originalRect);
            }
        }

        if (shouldClip) screen.popClip();
    }

    private _renderFooter(screen: Screen, x: number, y: number, width: number, height: number, footerHeight: number): void {
        if (!this._footer || footerHeight <= 0) return;
        this._renderFixedChild(this._footer, screen, {
            x,
            y: y + height - footerHeight,
            width,
            height: footerHeight,
        });
    }

    private _renderFixedChild(child: Widget | undefined, screen: Screen, rect: Rect): void {
        if (!child || rect.width <= 0 || rect.height <= 0) return;
        const originalRect = { ...child.rect };
        child.updateRect(rect);
        try {
            child.render(screen);
        } finally {
            child.updateRect(originalRect);
        }
    }

    private _clampMainScroll(viewportHeight = this._bodyHeight(), contentHeight = Math.max(this._main.rect.height || 0, viewportHeight)): void {
        const maxOffset = Math.max(0, contentHeight - viewportHeight);
        this._mainScrollOffset = Math.max(0, Math.min(this._mainScrollOffset, maxOffset));
    }

    private _bodyHeight(): number {
        const headerHeight = this._header ? 1 : 0;
        const footerHeight = this._footer ? 1 : 0;
        return Math.max(0, this.rect.height - headerHeight - footerHeight);
    }
}
