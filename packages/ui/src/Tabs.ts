// Tabs — tabbed container with keyboard switching
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface Tab { label: string; content: Widget; }
export interface TabsOptions {
    activeColor?: Style['fg'];
    inactiveColor?: Style['fg'];
    border?: Style['border'];
}

export class Tabs extends Widget {
    private _tabs: Tab[] = [];
    private _activeIndex = 0;
    private _activeColor: Style['fg'];
    private _inactiveColor: Style['fg'];
    focusable = true;

    constructor(tabs: Tab[], options: TabsOptions = {}) {
        super(mergeStyles(defaultStyle(), { flexGrow: 1, border: options.border ?? 'single' }));
        this._tabs = tabs;
        this._activeColor = options.activeColor ?? { type: 'named', name: 'cyan' };
        this._inactiveColor = options.inactiveColor ?? { type: 'named', name: 'brightBlack' };
    }

    get activeIndex(): number { return this._activeIndex; }
    selectTab(i: number): void {
        if (i >= 0 && i < this._tabs.length) { this._activeIndex = i; this.markDirty(); }
    }
    nextTab(): void {
        if (this._tabs.length === 0) return;
        this._activeIndex = (this._activeIndex + 1) % this._tabs.length;
        this.markDirty();
    }
    prevTab(): void {
        if (this._tabs.length === 0) return;
        this._activeIndex = (this._activeIndex - 1 + this._tabs.length) % this._tabs.length;
        this.markDirty();
    }
    get activeContent(): Widget | undefined { return this._tabs[this._activeIndex]?.content; }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;
        const attrs = styleToCellAttrs(this.style);
        let col = x;
        for (let i = 0; i < this._tabs.length; i++) {
            const tab = this._tabs[i];
            const isActive = i === this._activeIndex;
            const label = isActive ? ` ${caps.unicode ? '●' : '*'} ${tab.label} ` : `   ${tab.label} `;
            screen.writeString(col, y, label, {
                ...attrs,
                fg: isActive ? this._activeColor : this._inactiveColor,
                bold: isActive, dim: !isActive,
            });
            col += label.length;
            if (i < this._tabs.length - 1) { screen.writeString(col, y, caps.unicode ? '│' : '|', { ...attrs, dim: true }); col++; }
        }
        if (height > 1) screen.writeString(x, y + 1, '─'.repeat(width), { ...attrs, dim: true });

        // Render active tab content below the separator
        if (height > 2) {
            const content = this.activeContent;
            if (content) {
                content.updateRect({ x, y: y + 2, width, height: height - 2 });
                content.render(screen);
            }
        }
    }
}
