// CommandPalette — fuzzy-search command launcher with sub-menu navigation
import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    getBorderChars,
    caps,
    splitGraphemes,
} from '@termuijs/core';

export interface Command {
    id: string;
    label: string;
    shortcut?: string;
    action?: () => void;
    category?: string;
    children?: Command[];
}

export interface CommandPaletteOptions {
    commands?: Command[];
    placeholder?: string;
    borderColor?: Style['fg'];
    activeColor?: Style['fg'];
    maxVisible?: number;
    fuzzyMatch?: boolean;
}

function fuzzyScore(text: string, query: string): number {
    if (!query) return 1;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    let score = 0;
    let textIdx = 0;
    let prevMatchedIdx = -1;

    for (let i = 0; i < lowerQuery.length; i++) {
        const char = lowerQuery[i];
        const foundIdx = lowerText.indexOf(char, textIdx);
        if (foundIdx === -1) return 0; // No match

        score += 10;
        if (prevMatchedIdx !== -1 && foundIdx === prevMatchedIdx + 1) {
            score += 15; // Consecutive bonus
        }
        if (foundIdx === 0 || lowerText[foundIdx - 1] === ' ' || lowerText[foundIdx - 1] === ':') {
            score += 20; // Word start bonus
        }

        prevMatchedIdx = foundIdx;
        textIdx = foundIdx + 1;
    }

    return score;
}

export class CommandPalette extends Widget {
    private _rootCommands: Command[];
    private _menuStack: Array<{ title?: string; commands: Command[] }> = [];
    private _filtered: Command[] = [];
    private _query = '';
    private _cursorPos = 0;
    private _selectedIndex = 0;
    private _visible = false;
    private _placeholder: string;
    private _borderColor: Style['fg'];
    private _activeColor: Style['fg'];
    private _maxVisible: number;
    private _fuzzyMatch: boolean;
    focusable = true;

    constructor(
        commandsOrOptions: Command[] | CommandPaletteOptions = [],
        options: CommandPaletteOptions = {}
    ) {
        super(mergeStyles(defaultStyle(), {}));

        let cmds: Command[] = [];
        let opts: CommandPaletteOptions = options;

        if (Array.isArray(commandsOrOptions)) {
            cmds = commandsOrOptions;
        } else if (typeof commandsOrOptions === 'object') {
            cmds = commandsOrOptions.commands ?? [];
            opts = commandsOrOptions;
        }

        this._rootCommands = cmds;
        this._placeholder = opts.placeholder ?? 'Type a command...';
        this._borderColor = opts.borderColor ?? { type: 'named', name: 'cyan' };
        this._activeColor = opts.activeColor ?? { type: 'named', name: 'cyan' };
        this._maxVisible = opts.maxVisible ?? 10;
        this._fuzzyMatch = opts.fuzzyMatch ?? true;

        this._menuStack = [{ commands: this._rootCommands }];
        this._filter();
    }

    get visible(): boolean {
        return this._visible;
    }

    open(): void {
        this.show();
    }

    close(): void {
        this.hide();
    }

    show(): void {
        this._visible = true;
        this._query = '';
        this._cursorPos = 0;
        this._selectedIndex = 0;
        this._menuStack = [{ commands: this._rootCommands }];
        this._filter();
        this.markDirty();
    }

    hide(): void {
        this._visible = false;
        this.markDirty();
    }

    toggle(): void {
        this._visible ? this.hide() : this.show();
    }

    insertChar(ch: string): void {
        const query = splitGraphemes(this._query);
        const inserted = splitGraphemes(ch);
        query.splice(this._cursorPos, 0, ...inserted);
        this._query = query.join('');
        this._cursorPos += inserted.length;
        this._filter();
        this.markDirty();
    }

    deleteBack(): void {
        if (this._cursorPos === 0) {
            if (this._menuStack.length > 1) {
                this.popMenu();
            }
            return;
        }
        const query = splitGraphemes(this._query);
        query.splice(this._cursorPos - 1, 1);
        this._query = query.join('');
        this._cursorPos--;
        this._filter();
        this.markDirty();
    }

    selectNext(): void {
        if (this._selectedIndex < this._filtered.length - 1) {
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

    popMenu(): void {
        if (this._menuStack.length > 1) {
            this._menuStack.pop();
            this._query = '';
            this._cursorPos = 0;
            this._selectedIndex = 0;
            this._filter();
            this.markDirty();
        }
    }

    confirm(): void {
        const c = this._filtered[this._selectedIndex];
        if (!c) return;

        if (Array.isArray(c.children) && c.children.length > 0) {
            this._menuStack.push({ title: c.label, commands: c.children });
            this._query = '';
            this._cursorPos = 0;
            this._selectedIndex = 0;
            this._filter();
            this.markDirty();
        } else if (c.action) {
            this.hide();
            c.action();
        }
    }

    handleKey(event: KeyEvent): void {
        if (event.ctrl && event.key === 'p') {
            event.stopPropagation();
            this.toggle();
            return;
        }

        if (!this._visible) return;

        const { key, ctrl } = event;

        if (key === 'escape' || (ctrl && key === 'c')) {
            event.stopPropagation();
            if (this._menuStack.length > 1) {
                this.popMenu();
            } else {
                this.hide();
            }
            return;
        }

        if (key === 'up') {
            event.stopPropagation();
            this.selectPrev();
            return;
        }

        if (key === 'down') {
            event.stopPropagation();
            this.selectNext();
            return;
        }

        if (key === 'return' || key === 'enter') {
            event.stopPropagation();
            this.confirm();
            return;
        }

        if (key === 'backspace' || key === 'delete') {
            event.stopPropagation();
            this.deleteBack();
            return;
        }

        if (!ctrl && !event.alt && key.length === 1) {
            event.stopPropagation();
            this.insertChar(key);
        }
    }

    private _filter(): void {
        const currentCommands = this._menuStack[this._menuStack.length - 1]?.commands ?? [];
        const q = this._query.trim();

        if (!q) {
            this._filtered = [...currentCommands];
        } else if (this._fuzzyMatch) {
            const scored = currentCommands
                .map((cmd) => {
                    const targetText = `${cmd.label} ${cmd.category ?? ''}`;
                    const score = fuzzyScore(targetText, q);
                    return { cmd, score };
                })
                .filter((item) => item.score > 0)
                .sort((a, b) => b.score - a.score);

            this._filtered = scored.map((item) => item.cmd);
        } else {
            const lowerQ = q.toLowerCase();
            this._filtered = currentCommands.filter((c) => {
                const l = `${c.label} ${c.category ?? ''}`.toLowerCase();
                let qi = 0;
                for (let i = 0; i < l.length && qi < lowerQ.length; i++) {
                    if (l[i] === lowerQ[qi]) qi++;
                }
                return qi === lowerQ.length;
            });
        }
        this._selectedIndex = 0;
    }

    protected _renderSelf(screen: Screen): void {
        if (!this._visible) return;
        const { x, y, width, height } = this._rect;
        const attrs = styleToCellAttrs(this.style);

        const backdropCh = caps.unicode ? '░' : ' ';
        for (let r = 0; r < height; r++) {
            screen.writeString(x, y + r, backdropCh.repeat(width), { ...attrs, dim: true });
        }

        const vis = this._filtered.slice(0, this._maxVisible);
        const grouped = new Map<string, Command[]>();
        for (const cmd of vis) {
            const category = cmd.category ?? 'General';
            if (!grouped.has(category)) {
                grouped.set(category, []);
            }
            grouped.get(category)!.push(cmd);
        }

        const bw = Math.min(60, width - 4);
        const totalVisRows = grouped.size + vis.length;
        const bh = Math.min(totalVisRows + 3, height - 2);
        const bx = x + Math.floor((width - bw) / 2);
        const by = y + 2;
        const border = getBorderChars('single');
        if (!border) return;
        const ba = { ...attrs, fg: this._borderColor };

        // Top
        screen.writeString(bx, by, border.topLeft + border.top.repeat(bw - 2) + border.topRight, ba);

        // Input row
        screen.writeString(bx, by + 1, border.left, ba);
        const activeStack = this._menuStack[this._menuStack.length - 1];
        const prefixTitle = activeStack?.title ? `[${activeStack.title}] ` : '';
        const input = prefixTitle + (this._query || this._placeholder);
        screen.writeString(
            bx + 1,
            by + 1,
            (` ${caps.unicode ? '🔍' : '[?]'} ` + input).slice(0, bw - 2).padEnd(bw - 2),
            { ...attrs, dim: !this._query }
        );
        screen.writeString(bx + bw - 1, by + 1, border.right, ba);

        // Separator
        screen.writeString(bx, by + 2, border.left + '─'.repeat(bw - 2) + border.right, ba);

        // Items
        let rowOffset = 0;
        let itemIndex = 0;

        for (const [category, commands] of grouped) {
            if (by + 3 + rowOffset >= by + bh - 1) break;

            screen.writeString(
                bx + 1,
                by + 3 + rowOffset,
                `[${category}]`,
                { ...attrs, bold: true }
            );

            rowOffset++;

            for (const c of commands) {
                if (by + 3 + rowOffset >= by + bh - 1) break;

                const active = itemIndex === this._selectedIndex;
                const prefix = active ? (caps.unicode ? '❯ ' : '> ') : '  ';
                const hasChildren = Array.isArray(c.children) && c.children.length > 0;
                const suffix = hasChildren ? ' ▶' : '';
                const shortcutStr = c.shortcut ? c.shortcut : '';

                const leftText = prefix + c.label + suffix;
                const maxLeftLen = bw - 4 - (shortcutStr ? shortcutStr.length + 2 : 0);
                const truncatedLeft = leftText.slice(0, Math.max(1, maxLeftLen));

                let lineContent: string;
                if (shortcutStr && maxLeftLen > 0) {
                    const padLen = Math.max(1, bw - 4 - truncatedLeft.length - shortcutStr.length);
                    lineContent = truncatedLeft + ' '.repeat(padLen) + shortcutStr;
                } else {
                    lineContent = truncatedLeft.padEnd(bw - 4);
                }

                screen.writeString(
                    bx + 1,
                    by + 3 + rowOffset,
                    lineContent,
                    {
                        ...attrs,
                        fg: active ? this._activeColor : attrs.fg,
                        bold: active,
                    }
                );

                rowOffset++;
                itemIndex++;
            }
        }

        // Bottom
        const last = Math.min(by + 3 + totalVisRows, by + bh - 1);
        screen.writeString(
            bx,
            last,
            border.bottomLeft + border.bottom.repeat(bw - 2) + border.bottomRight,
            ba
        );
    }
}
