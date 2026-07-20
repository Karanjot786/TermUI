// Pages — named page container with optional overlay behavior
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle } from '@termuijs/core';

export interface Page {
    name: string;
    content: Widget;
    overlay?: boolean;
}

export interface PagesOptions {
    style?: Partial<Style>;
}

export class Pages extends Widget {
    private _pages: Page[];
    private _activePageName?: string;

    constructor(pages: Page[], options: PagesOptions = {}) {
        super(mergeStyles(defaultStyle(), options.style ?? { flexGrow: 1 }));
        this._pages = pages;
        for (const page of pages) {
            this.addChild(page.content);
        }
        this._activePageName = pages[0]?.name;
        this._updatePageVisibility();
    }

    get activePage(): string | undefined {
        return this._activePageName;
    }

    switchTo(name: string): void {
        const page = this._pages.find((item) => item.name === name);
        if (!page || page.name === this._activePageName) return;
        this._activePageName = page.name;
        this._updatePageVisibility();
        this.markDirty();
    }

    protected _renderSelf(_screen: Screen): void {
        // Container only
    }

    private _updatePageVisibility(): void {
        const active = this._pages.find((item) => item.name === this._activePageName) ?? this._pages[0];
        const base = this._pages[0];

        for (const page of this._pages) {
            const shouldShow = page === active || (active?.overlay === true && page === base && page !== active);
            page.content.setStyle({ visible: shouldShow });
        }
    }
}
