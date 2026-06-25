// ─────────────────────────────────────────────────────
// Todo App — built with @termuijs/quick
//
// Showcases: multiProgress, commandPalette, batch, caps
// ─────────────────────────────────────────────────────

import { app, list, input, text, commandPalette, spacer, multiProgress } from '@termuijs/quick';
import { batch } from '@termuijs/store';
import { caps, type Screen, type Color, styleToCellAttrs, type Style } from '@termuijs/core';

// ── Theme definitions ────────────────────────────────
interface Theme {
    name: string;
    border: Color;
    text: Color;
    doneBar: Color;
    pendingBar: Color;
    inputBorder: Color;
    titleFg: Color;
}

const darkTheme: Theme = {
    name: 'Dark Mode',
    border: { type: 'named', name: 'brightBlack' },
    text: { type: 'named', name: 'white' },
    doneBar: { type: 'named', name: 'green' },
    pendingBar: { type: 'named', name: 'red' },
    inputBorder: { type: 'named', name: 'blue' },
    titleFg: { type: 'named', name: 'cyan' },
};

const lightTheme: Theme = {
    name: 'Light Mode',
    border: { type: 'named', name: 'black' },
    text: { type: 'named', name: 'black' },
    doneBar: { type: 'named', name: 'green' },
    pendingBar: { type: 'named', name: 'red' },
    inputBorder: { type: 'named', name: 'brightBlue' },
    titleFg: { type: 'named', name: 'blue' },
};

interface ProgressItem {
    label: string;
    value: number; // 0–1
    color?: Color;
}

// Extract the MultiProgress class from @termuijs/quick at runtime
// to ensure perfect constructor/prototype matching for instanceof checks.
const dummyProgress = multiProgress([]);
const MultiProgressClass = Object.getPrototypeOf(dummyProgress).constructor;

// ── Custom MultiProgress with percentage inside the bar ──────
class CustomMultiProgress extends (MultiProgressClass as any) {
    public customItems: ProgressItem[] = [];
    private _customLabelWidth: number;

    constructor(
        options: { items: ProgressItem[]; labelWidth?: number; showValues?: boolean },
        style: Partial<Style> = {}
    ) {
        super(options, style);
        this.customItems = options.items;
        this._customLabelWidth = options.labelWidth ?? 12;
    }

    override setItems(items: ProgressItem[]): void {
        super.setItems(items);
        this.customItems = items;
        this.markDirty();
    }

    protected override _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Determine bar characters
        const fillChar = caps.unicode ? '█' : '#';
        const emptyChar = caps.unicode ? '░' : ' ';

        for (let i = 0; i < this.customItems.length; i++) {
            const item = this.customItems[i];
            const rowY = y + i;
            let colX = x;

            // 1. Render label
            const label = item.label.length > this._customLabelWidth
                ? item.label.substring(0, this._customLabelWidth)
                : item.label.padEnd(this._customLabelWidth);
            screen.writeString(colX, rowY, label, attrs);
            colX += this._customLabelWidth;

            // 2. Space after label
            if (colX < x + width) {
                screen.setCell(colX, rowY, { char: ' ', ...attrs });
                colX++;
            }

            // 3. Render bar with percentage inside
            const barWidth = Math.max(0, x + width - colX);
            const value = Math.max(0, Math.min(1, item.value));
            const filled = Math.round(barWidth * value);

            const pct = Math.round(value * 100);
            const percentStr = ` ${pct}% `;
            const showPct = barWidth >= percentStr.length;
            const labelStart = showPct ? Math.floor((barWidth - percentStr.length) / 2) : -1;

            const fillColor = item.color ?? { type: 'named', name: 'green' };

            for (let col = 0; col < barWidth; col++) {
                const cellX = colX + col;
                const isText = labelStart !== -1 && col >= labelStart && col < labelStart + percentStr.length;
                const char = isText ? percentStr[col - labelStart] : (col < filled ? fillChar : emptyChar);

                if (col < filled) {
                    if (isText) {
                        screen.setCell(cellX, rowY, {
                            char,
                            ...attrs,
                            fg: fillColor,
                            inverse: true,
                            bold: true
                        });
                    } else {
                        screen.setCell(cellX, rowY, {
                            char,
                            ...attrs,
                            fg: fillColor
                        });
                    }
                } else {
                    if (isText) {
                        screen.setCell(cellX, rowY, {
                            char,
                            ...attrs,
                            fg: attrs.fg,
                            bold: true
                        });
                    } else {
                        screen.setCell(cellX, rowY, {
                            char,
                            ...attrs,
                            dim: true
                        });
                    }
                }
            }
        }
    }
}

function customMultiProgress(
    items: ProgressItem[] | (() => ProgressItem[]),
    opts: { labelWidth?: number } = {}
): any {
    const initialItems = typeof items === 'function' ? items() : items;
    const cmp = new CustomMultiProgress({ items: initialItems, labelWidth: opts.labelWidth, showValues: false }, { flexGrow: 1 });
    if (typeof items === 'function') {
        (cmp as any).__reactiveMultiItems = items;
    }
    return cmp;
}

// ── State management ──────────────────────────────────
const todos: string[] = ['Learn TermUI', 'Build a CLI app', 'Ship to npm'];
let currentFilter: 'all' | 'completed' | 'pending' = 'all';
let isDark = true;

const done = () => todos.filter(t => t.startsWith('[x] ')).length;
const pending = () => todos.length - done();
const total = () => Math.max(todos.length, 1);

interface TodoItem {
    text: string;
    originalIndex: number;
}

const getFilteredTodos = (): TodoItem[] => {
    return todos
        .map((text, index) => ({ text, originalIndex: index }))
        .filter(item => {
            const isDone = item.text.startsWith('[x] ');
            if (currentFilter === 'completed') return isDone;
            if (currentFilter === 'pending') return !isDone;
            return true;
        });
};

const getFilteredTodoLabels = (): string[] => {
    return getFilteredTodos().map(item => item.text);
};

// ── UI Components ─────────────────────────────────────
const statsText = () => {
    const d = done();
    const p = pending();
    const pct = total() > 0 ? Math.round((d / total()) * 100) : 0;
    if (caps.unicode) {
        return ` ✅ Done: ${d} | ⏳ Pending: ${p} | 📊 ${pct}%`;
    } else {
        return ` [x] Done: ${d} | [ ] Pending: ${p} | Bar: ${pct}%`;
    }
};

const filterBarText = () => {
    if (caps.unicode) {
        const allIndicator = currentFilter === 'all' ? '● ALL' : '○ ALL';
        const compIndicator = currentFilter === 'completed' ? '● COMPLETED' : '○ COMPLETED';
        const pendIndicator = currentFilter === 'pending' ? '● PENDING' : '○ PENDING';
        return `  Filter: [ ${allIndicator} ]  [ ${compIndicator} ]  [ ${pendIndicator} ]  (Press 'f' to cycle / 't' to theme)`;
    } else {
        const allIndicator = currentFilter === 'all' ? '* ALL' : '  ALL';
        const compIndicator = currentFilter === 'completed' ? '* COMPLETED' : '  COMPLETED';
        const pendIndicator = currentFilter === 'pending' ? '* PENDING' : '  PENDING';
        return `  Filter: [ ${allIndicator} ]  [ ${compIndicator} ]  [ ${pendIndicator} ]  (Press 'f' to cycle / 't' to theme)`;
    }
};

const statsTextWidget = text(() => statsText(), { bold: true });
const filterBarWidget = text(() => filterBarText(), { bold: true });

const donePendingBar = customMultiProgress(() => {
    const theme = isDark ? darkTheme : lightTheme;
    return [
        { label: 'Done', value: done() / total(), color: theme.doneBar },
        { label: 'Pending', value: pending() / total(), color: theme.pendingBar },
    ];
}, { labelWidth: 10 });

const todoList = list(() => getFilteredTodoLabels(), {
    selectable: true,
    onSelect: (idx: number) => {
        const filtered = getFilteredTodos();
        if (idx >= 0 && idx < filtered.length) {
            const origIdx = filtered[idx].originalIndex;
            todos[origIdx] = todos[origIdx].startsWith('[x] ')
                ? todos[origIdx].slice(4)
                : `[x] ${todos[origIdx]}`;
        }
    },
});

const todoInput = input('Type a todo and press Enter...', {
    onSubmit: (value: string) => batch(() => {
        if (value.trim()) todos.push(value.trim());
    }),
});

// ── Theme application ─────────────────────────────────
const applyTheme = () => {
    const theme = isDark ? darkTheme : lightTheme;

    todoList.setStyle({
        borderColor: theme.border,
        fg: theme.text,
    });

    todoInput.setStyle({
        borderColor: theme.inputBorder,
        fg: theme.text,
    });

    donePendingBar.setStyle({
        borderColor: theme.border,
        fg: theme.text,
    });

    statsTextWidget.setStyle({
        fg: theme.titleFg,
    });

    filterBarWidget.setStyle({
        fg: theme.text,
    });
};

// Set initial style
applyTheme();

const cycleFilter = () => {
    if (currentFilter === 'all') currentFilter = 'completed';
    else if (currentFilter === 'completed') currentFilter = 'pending';
    else currentFilter = 'all';
};

const toggleTheme = () => {
    isDark = !isDark;
    applyTheme();
};

const myApp = app(caps.unicode ? '✅ Todo App' : '[x] Todo App')
    .rows(
        statsTextWidget,
        filterBarWidget,
        spacer(1),
        donePendingBar,
        spacer(1),
        text('📋 Tasks:', { bold: true }),
        todoList,
        spacer(1),
        text('➕ Add New Task:', { bold: true }),
        todoInput,
        spacer(1),
        commandPalette([
            {
                label: 'Clear Done',
                description: 'x',
                action: () => batch(() => {
                    const keep = todos.filter(t => !t.startsWith('[x] '));
                    todos.length = 0;
                    todos.push(...keep);
                }),
            },
            { label: 'Quit', description: 'q', action: () => process.exit(0) },
        ]),
    )
    .keys({
        x: 'clear done',
        q: 'quit',
        f: 'cycle filter',
        t: 'toggle theme',
        '↑↓': 'navigate',
        '⏎': 'toggle/add',
    })
    .refresh('500ms');

// Start the app asynchronously
myApp.run();

// Wire up global keyboard events for immediate reactive updates
const appInstance = (myApp as any)._app;
if (appInstance) {
    appInstance.events.on('key', (event: any) => {
        // Prevent commands when typing a task
        if (todoInput.isFocused) {
            return;
        }

        if (event.key === 'q') {
            appInstance.exit();
        } else if (event.key === 'x') {
            batch(() => {
                const keep = todos.filter(t => !t.startsWith('[x] '));
                todos.length = 0;
                todos.push(...keep);
            });
            appInstance.requestRender();
        } else if (event.key === 'f') {
            cycleFilter();
            appInstance.requestRender();
        } else if (event.key === 't') {
            toggleTheme();
            appInstance.requestRender();
        }
    });
}
