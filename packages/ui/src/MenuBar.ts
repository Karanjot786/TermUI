// MenuBar — horizontal menu bar with dropdown menus
import { Widget } from '@termuijs/widgets';
import { type Style, type Color, type KeyEvent, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface MenuItem {
    label: string;
    action?: () => void;
    disabled?: boolean;
}

export interface MenuBarItem {
    label: string;
    items: MenuItem[];
}

export interface MenuBarOptions {
    activeColor?: Color;
}

export class MenuBar extends Widget {
    private _menus: MenuBarItem[] = [];
    private _activeMenu = 0;
    private _isOpen = false;
    private _activeItem = -1;
    private _activeColor: Color;
    focusable = true;

    constructor(menus: MenuBarItem[], style?: Partial<Style>, opts?: MenuBarOptions) {
        super(mergeStyles(defaultStyle(), { height: 1, ...style }));
        this._menus = menus;
        this._activeColor = opts?.activeColor ?? { type: 'named', name: 'cyan' };
    }

    get activeMenu(): number {
        return this._activeMenu;
    }

    get isOpen(): boolean {
        return this._isOpen;
    }

    get activeItem(): number {
        return this._activeItem;
    }

    get menus(): MenuBarItem[] {
        return this._menus;
    }

    setMenus(menus: MenuBarItem[]): void {
        this._menus = menus;
        this._activeMenu = 0;
        this._isOpen = false;
        this._activeItem = -1;
        this.markDirty();
    }

    private _initActiveItem(): void {
        const items = this._menus[this._activeMenu]?.items ?? [];
        let firstEnabled = -1;
        for (let i = 0; i < items.length; i++) {
            if (!items[i].disabled) {
                firstEnabled = i;
                break;
            }
        }
        this._activeItem = firstEnabled;
    }

    private _selectNextItem(): void {
        const items = this._menus[this._activeMenu]?.items ?? [];
        if (items.length === 0) return;
        let n = this._activeItem;
        const start = n;
        do {
            n = (n + 1) % items.length;
            if (!items[n].disabled) {
                this._activeItem = n;
                this.markDirty();
                return;
            }
        } while (n !== start);
    }

    private _selectPrevItem(): void {
        const items = this._menus[this._activeMenu]?.items ?? [];
        if (items.length === 0) return;
        let n = this._activeItem;
        const start = n;
        do {
            n = (n - 1 + items.length) % items.length;
            if (!items[n].disabled) {
                this._activeItem = n;
                this.markDirty();
                return;
            }
        } while (n !== start);
    }

    private _openMenu(): void {
        this._initActiveItem();
        this._isOpen = true;
        this.markDirty();
    }

    private _closeMenu(): void {
        this._isOpen = false;
        this.markDirty();
    }

    selectNextMenu(): void {
        if (this._menus.length === 0) return;
        this._activeMenu = (this._activeMenu + 1) % this._menus.length;
        if (this._isOpen) {
            this._initActiveItem();
        }
        this.markDirty();
    }

    selectPrevMenu(): void {
        if (this._menus.length === 0) return;
        this._activeMenu = (this._activeMenu - 1 + this._menus.length) % this._menus.length;
        if (this._isOpen) {
            this._initActiveItem();
        }
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        const key = event.key.toLowerCase();

        if (this._isOpen) {
            if (key === 'escape') {
                this._closeMenu();
            } else if (key === 'up') {
                this._selectPrevItem();
            } else if (key === 'down') {
                this._selectNextItem();
            } else if (key === 'enter') {
                const items = this._menus[this._activeMenu]?.items ?? [];
                const activeItem = items[this._activeItem];
                if (activeItem && !activeItem.disabled) {
                    if (activeItem.action) {
                        activeItem.action();
                    }
                    this._closeMenu();
                }
            } else if (key === 'left') {
                this.selectPrevMenu();
            } else if (key === 'right') {
                this.selectNextMenu();
            }
        } else {
            if (key === 'left') {
                this.selectPrevMenu();
            } else if (key === 'right') {
                this.selectNextMenu();
            } else if (key === 'enter') {
                this._openMenu();
            }
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        let col = x;
        const menuPositions: number[] = [];

        for (let i = 0; i < this._menus.length; i++) {
            const menu = this._menus[i];
            const isActive = i === this._activeMenu;
            const label = `  ${menu.label}  `;
            menuPositions.push(col);

            if (col < x + width) {
                const visibleLabel = label.slice(0, x + width - col);
                screen.writeString(col, y, visibleLabel, {
                    ...attrs,
                    fg: isActive ? this._activeColor : attrs.fg,
                    bold: isActive,
                });
            }
            col += label.length;
        }

        if (this._isOpen) {
            const menu = this._menus[this._activeMenu];
            if (menu) {
                const items = menu.items;
                const menuX = menuPositions[this._activeMenu];
                const maxItemLabelLength = items.reduce((max, item) => Math.max(max, item.label.length), 0);
                const dropdownWidth = Math.max(
                    `  ${menu.label}  `.length,
                    maxItemLabelLength + 4
                );

                for (let k = 0; k < items.length; k++) {
                    const item = items[k];
                    const isSel = k === this._activeItem;
                    const prefix = isSel ? (caps.unicode ? '● ' : '* ') : '  ';
                    const itemText = prefix + item.label;
                    const paddedText = itemText.padEnd(dropdownWidth);

                    if (menuX < x + width) {
                        const visibleText = paddedText.slice(0, x + width - menuX);
                        screen.writeString(menuX, y + 1 + k, visibleText, {
                            ...attrs,
                            fg: item.disabled
                                ? { type: 'named', name: 'brightBlack' }
                                : isSel
                                    ? this._activeColor
                                    : attrs.fg,
                            bold: isSel,
                            dim: item.disabled,
                        });
                    }
                }
            }
        }
    }
}
