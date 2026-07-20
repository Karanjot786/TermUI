// CommandPalette — fuzzy-search command launcher
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, getBorderChars, caps } from '@termuijs/core';

export interface Command { id: string; label: string; shortcut?: string; action: () => void; category?: string; }
export interface CommandPaletteOptions { placeholder?: string; borderColor?: Style['fg']; activeColor?: Style['fg']; maxVisible?: number; }

export class CommandPalette extends Widget {
    private _commands: Command[];
    private _filtered: Command[] = [];
    private _query = '';
    private _cursorPos = 0;
    private _selectedIndex = 0;
    private _visible = false;
    private _placeholder: string;
    private _borderColor: Style['fg'];
    private _activeColor: Style['fg'];
    private _maxVisible: number;
    focusable = true;

    constructor(commands: Command[], options: CommandPaletteOptions = {}) {
        super(mergeStyles(defaultStyle(), {}));
        this._commands = commands;
        this._filtered = [...commands];
        this._placeholder = options.placeholder ?? 'Type a command...';
        this._borderColor = options.borderColor ?? { type: 'named', name: 'cyan' };
        this._activeColor = options.activeColor ?? { type: 'named', name: 'cyan' };
        this._maxVisible = options.maxVisible ?? 10;
    }

    get visible(): boolean { return this._visible; }
    show(): void { this._visible = true; this._query = ''; this._cursorPos = 0; this._selectedIndex = 0; this._filtered = [...this._commands]; this.markDirty(); }
    hide(): void { this._visible = false; this.markDirty(); }
    toggle(): void { this._visible ? this.hide() : this.show(); }
    insertChar(ch: string): void { this._query = this._query.slice(0, this._cursorPos) + ch + this._query.slice(this._cursorPos); this._cursorPos++; this._filter(); this.markDirty(); }
    deleteBack(): void { if (this._cursorPos > 0) { this._query = this._query.slice(0, this._cursorPos - 1) + this._query.slice(this._cursorPos); this._cursorPos--; this._filter(); this.markDirty(); } }
    selectNext(): void { if (this._selectedIndex < this._filtered.length - 1) { this._selectedIndex++; this.markDirty(); } }
    selectPrev(): void { if (this._selectedIndex > 0) { this._selectedIndex--; this.markDirty(); } }
    confirm(): void { const c = this._filtered[this._selectedIndex]; if (c) { this.hide(); c.action(); } }

    private _filter(): void {
        const q = this._query.toLowerCase();
        if (!q) { this._filtered = [...this._commands]; } else {
            this._filtered = this._commands.filter(c => { const l = c.label.toLowerCase(); let qi = 0; for (let i = 0; i < l.length && qi < q.length; i++) { if (l[i] === q[qi]) qi++; } return qi === q.length; });
        }
        this._selectedIndex = 0;
    }

    protected _renderSelf(screen: Screen): void {
        if (!this._visible) return;
        const { x, y, width, height } = this._rect;
        const attrs = styleToCellAttrs(this.style);
        // Backdrop
        const backdropCh = caps.unicode ? '░' : ' ';
        for (let r = 0; r < height; r++) screen.writeString(x, y + r, backdropCh.repeat(width), { ...attrs, dim: true });
        // Box
        const vis = this._filtered.slice(0, this._maxVisible);
        const bw = Math.min(60, width - 4);
        const bh = Math.min(vis.length + 3, height - 2);
        const bx = x + Math.floor((width - bw) / 2);
        const by = y + 2;
        const border = getBorderChars('single');
        if (!border) return;
        const ba = { ...attrs, fg: this._borderColor };
        // Top
        screen.writeString(bx, by, border.topLeft + border.top.repeat(bw - 2) + border.topRight, ba);
        // Input row
        screen.writeString(bx, by + 1, border.left, ba);
        const input = this._query || this._placeholder;
        screen.writeString(bx + 1, by + 1, (` ${caps.unicode ? '🔍' : '[?]'} ` + input).slice(0, bw - 2).padEnd(bw - 2), { ...attrs, dim: !this._query });
        screen.writeString(bx + bw - 1, by + 1, border.right, ba);
        // Separator
        screen.writeString(bx, by + 2, border.left + '─'.repeat(bw - 2) + border.right, ba);
        // Items
        for (let i = 0; i < vis.length && i + 3 < bh - 1; i++) {
            const c = vis[i]; const active = i === this._selectedIndex;
            const label = (active ? (caps.unicode ? '❯ ' : '> ') : '  ') + c.label;
            const sc = c.shortcut ?? '';
            screen.writeString(bx, by + 3 + i, border.left, ba);
            screen.writeString(bx + 1, by + 3 + i, (' ' + label).slice(0, bw - sc.length - 3).padEnd(bw - sc.length - 3), { ...attrs, fg: active ? this._activeColor : attrs.fg, bold: active });
            if (sc) screen.writeString(bx + bw - sc.length - 2, by + 3 + i, sc, { ...attrs, dim: true });
            screen.writeString(bx + bw - 1, by + 3 + i, border.right, ba);
        }
        // Bottom
        const last = Math.min(by + 3 + vis.length, by + bh - 1);
        screen.writeString(bx, last, border.bottomLeft + border.bottom.repeat(bw - 2) + border.bottomRight, ba);
    }
}
