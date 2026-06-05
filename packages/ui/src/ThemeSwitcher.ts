// ─────────────────────────────────────────────────────
// @termuijs/ui — ThemeSwitcher widget
//
// A list-based widget to display and switch between different themes.
// - Keyboard navigable (Up/Down or K/J)
// - Emits onChange(themeName) when a theme is confirmed via Enter/Space
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface ThemeSwitcherOptions {
    themes?: string[];
    activeTheme?: string;
    onChange?: (theme: string) => void;
    activeColor?: Style['fg'];
}

export class ThemeSwitcher extends Widget {
    private _themes: string[];
    private _activeTheme: string;
    private _selectedIndex: number;
    private _onChange?: (theme: string) => void;
    private _activeColor: Style['fg'];
    focusable = true;

    constructor(options: ThemeSwitcherOptions = {}) {
        const themes = options.themes ?? [
            'default',
            'cyberpunk',
            'nord',
            'dracula',
            'gruvbox',
            'catppuccin',
            'solarized',
            'tokyo-night',
            'highContrast'
        ];

        super(mergeStyles(defaultStyle(), { border: 'single', height: themes.length + 2 }));

        this._themes = themes;
        this._activeTheme = options.activeTheme ?? 'default';
        this._selectedIndex = this._themes.indexOf(this._activeTheme);
        if (this._selectedIndex === -1) {
            this._activeTheme = this._themes[0] ?? '';
            this._selectedIndex = 0;
        }
        this._onChange = options.onChange;
        this._activeColor = options.activeColor ?? { type: 'named', name: 'cyan' };
    }

    get activeTheme(): string {
        return this._activeTheme;
    }

    set activeTheme(theme: string) {
        if (this._activeTheme === theme) return;
        this._activeTheme = theme;
        const idx = this._themes.indexOf(theme);
        if (idx !== -1) {
            this._selectedIndex = idx;
        }
        this.markDirty();
    }

    get themes(): string[] {
        return this._themes;
    }

    get selectedIndex(): number {
        return this._selectedIndex;
    }

    selectNext(): void {
        if (this._selectedIndex < this._themes.length - 1) {
            this._selectedIndex++;
            this.markDirty();
        }
    }

    selectPrev(): void {
        if (this._selectedIndex > 0) {
            this._selectedIndex--;
            this.markDirty();
        }
    }

    confirm(): void {
        const theme = this._themes[this._selectedIndex];
        if (theme) {
            this._activeTheme = theme;
            this._onChange?.(theme);
            this.markDirty();
        }
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'up':
            case 'k':
                this.selectPrev();
                break;
            case 'down':
            case 'j':
                this.selectNext();
                break;
            case 'enter':
            case 'space':
                this.confirm();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        for (let i = 0; i < this._themes.length; i++) {
            if (i >= height) break;

            const themeName = this._themes[i];
            const isSelected = i === this._selectedIndex;
            const isActive = themeName === this._activeTheme;

            let prefix = '  ';
            if (isActive && isSelected) {
                prefix = caps.unicode ? '●▸' : '*>';
            } else if (isActive) {
                prefix = caps.unicode ? '● ' : '* ';
            } else if (isSelected) {
                prefix = caps.unicode ? ' ▸' : ' >';
            }

            const formattedName = themeName.charAt(0).toUpperCase() + themeName.slice(1);
            const lineText = `${prefix} ${formattedName}`;

            screen.writeString(x, y + i, lineText.slice(0, width), {
                ...attrs,
                fg: isSelected ? this._activeColor : attrs.fg,
                bold: isSelected || isActive,
            });
        }
    }
}
