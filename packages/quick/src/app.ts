// ─────────────────────────────────────────────────────
// @termuijs/quick — AppBuilder: the fluent API entry point
// ─────────────────────────────────────────────────────

import { App, type KeyEvent } from '@termuijs/core';
import {
    Box,
    Text,
    Widget,
    Gauge,
    Sparkline,
    StatusIndicator,
    Table,
    LogView,
    List,
    TextInput,
    BarChart,
    ProgressBar,
    Tree,
    MultiProgress,
} from '@termuijs/widgets';
import type { ProgressItem } from '@termuijs/widgets';
import type { LayoutChild } from './layout.js';
import { toWidget } from './layout.js';
import { resolve, type Reactive } from './reactive.js';

// ── Error display helper ──────────────────────────────

/**
 * Create a simple error display widget — a red-bordered box with the error message.
 * Used as the fallback when the app fails to start.
 */
function createErrorWidget(err: Error): Widget {
    const box = new Box({
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        border: 'single',
        borderColor: { type: 'named', name: 'red' },
        padding: 1,
    });
    box.addChild(new Text('  Application Error', {
        height: 1,
        bold: true,
        fg: { type: 'named', name: 'red' },
    }));
    box.addChild(new Text('', { height: 1 }));
    const message = err.message || String(err);
    box.addChild(new Text(`  ${message}`, {
        height: 1,
        fg: { type: 'named', name: 'yellow' },
    }));
    if (err.stack) {
        box.addChild(new Text('', { height: 1 }));
        const stackLines = err.stack.split('\n').slice(1, 5);
        for (const line of stackLines) {
            box.addChild(new Text(`  ${line.trim()}`, {
                height: 1,
                dim: true,
            }));
        }
    }
    box.addChild(new Text('', { height: 1 }));
    box.addChild(new Text('  Press Ctrl+C to exit.', {
        height: 1,
        dim: true,
    }));
    return box;
}

export interface QuickKeyAction {
    key: string;
    action: string | (() => void);
}

function parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)(ms|s|m)$/);
    if (!match) return 1000;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
        case 'ms': return value;
        case 's': return value * 1000;
        case 'm': return value * 60000;
        default: return 1000;
    }
}

/**
 * Walk a widget tree and collect all widgets matching a predicate.
 */
function walkWidgets(root: Widget, predicate: (w: Widget) => boolean): Widget[] {
    const result: Widget[] = [];
    const stack: Widget[] = [root];

    while (stack.length > 0) {
        const w = stack.pop()!;
        if (predicate(w)) result.push(w);
        // Push children in reverse order so pop() visits them left-to-right
        for (let i = w.children.length - 1; i >= 0; i--) {
            stack.push(w.children[i]);
        }
    }

    return result;
}

/**
 * The main fluent builder. Users call `app('title')` to start.
 *
 * @example
 * ```ts
 * app('My Dashboard')
 *   .rows(
 *     row(gauge('CPU', cpu.percent), gauge('Mem', memory.percent)),
 *     table('Processes', processes.top(5), ['name', 'cpu%']),
 *   )
 *   .keys({ q: 'quit', r: 'refresh' })
 *   .refresh('1s')
 *   .run();
 * ```
 */
export class AppBuilder {
    private _title: string;
    private _children: LayoutChild[] = [];
    private _keyMap: Record<string, string | (() => void)> = {};
    private _refreshInterval: number | null = null;
    private _onError: ((err: unknown) => void) | null = null;
    private _fullscreen = true;
    private _app: App | null = null;

    constructor(title: string) {
        this._title = title;
    }

    /**
     * Set the layout using vertical rows.
     */
    rows(...children: LayoutChild[]): this {
        this._children = children;
        return this;
    }

    /**
     * Bind hotkeys:
     * - `'quit'` — exits the app
     * - `'refresh'` — forces an immediate refresh
     * - `() => void` — custom handler
     */
    keys(map: Record<string, string | (() => void)>): this {
        this._keyMap = { ...this._keyMap, ...map };
        return this;
    }

    /**
     * Set auto-refresh interval. Accepts: '500ms', '1s', '5s', '1m'.
     */
    refresh(interval: string): this {
        this._refreshInterval = parseInterval(interval);
        return this;
    }

    /** Register an error handler for reactive widget errors. */
    onError(handler: (err: unknown) => void): this {
        this._onError = handler;
        return this;
    }

    /**
     * Set fullscreen mode (default: true).
     */
    fullscreen(enabled: boolean): this {
        this._fullscreen = enabled;
        return this;
    }

    /**
     * Build the widget tree and run the app.
     * Returns a promise that resolves when the app exits.
     *
     * If widget-tree construction throws, an error panel is shown instead
     * of crashing the process (analogous to an ErrorBoundary for widget-mode).
     */
    async run(): Promise<number> {
        let root: Box;

        try {
            root = this._buildRoot();
        } catch (err) {
            // Error boundary fallback — display a red-bordered error widget
            const errWidget = createErrorWidget(
                err instanceof Error ? err : new Error(String(err)),
            );
            const errorRoot = new Box({
                flexDirection: 'column',
                width: '100%',
                height: '100%',
            });
            errorRoot.addChild(errWidget);
            const errorApp = new App(errorRoot, { fullscreen: this._fullscreen, skipFallback: true });
            errorApp.events.on('key', (event: KeyEvent) => {
                if (event.ctrl && event.key === 'c') {
                    errorApp.exit(1);
                }
            });
            return errorApp.mount();
        }

        return this._runWithRoot(root);
    }

    /**
     * Build the root Box widget tree from the configured children, title, and key hints.
     * Throws on any widget-construction error — caught by run() as an error boundary.
     */
    private _buildRoot(): Box {
        const root = new Box({
            flexDirection: 'column',
            width: '100%',
            height: '100%',
        });

        // Title bar
        const titleBar = new Text(`  ${this._title}`, {
            height: 1,
            bold: true,
            fg: { type: 'named', name: 'cyan' },
        }, { align: 'center' });
        root.addChild(titleBar);

        // Content area
        const content = new Box({
            flexDirection: 'column',
            flexGrow: 1,
        });
        for (const child of this._children) {
            content.addChild(toWidget(child));
        }
        root.addChild(content);

        // Footer with key hints
        const keyHints = Object.entries(this._keyMap)
            .map(([key, action]) => {
                const label = typeof action === 'string' ? action : key;
                return `${key} ${label}`;
            })
            .join('  •  ');
        if (keyHints) {
            const footer = new Text(`  ${keyHints}`, {
                height: 1,
                dim: true,
            });
            root.addChild(footer);
        }

        return root;
    }

    /**
     * Wire up the App, key events, focus management, and refresh loop for a built root widget.
     */
    private async _runWithRoot(root: Box): Promise<number> {
        // Create the App
        const appInstance = new App(root, { fullscreen: this._fullscreen, skipFallback: true });
        this._app = appInstance;

        // ── Discover focusable widgets (List, TextInput) in tree order ──
        const focusableWidgets = walkWidgets(root, w => w instanceof List || w instanceof TextInput) as Array<List | TextInput>;

        // Register focusable widgets with the focus manager
        let _focusedIdx = -1;
        let _unsubFocus: (() => void) | undefined;
        let _unsubBlur: (() => void) | undefined;
        if (focusableWidgets.length > 0) {
            focusableWidgets.forEach((w, i) => {
                appInstance.focus.register({ id: `quick-${i}`, tabIndex: i, focusable: true });
            });
            // Auto-focus the first one
            _focusedIdx = 0;
            focusableWidgets[0].isFocused = true;

            // Listen for focus changes
            _unsubFocus = appInstance.focus.on('focus', (evt) => {
                const idx = parseInt(evt.targetId.replace('quick-', ''), 10);
                if (!isNaN(idx) && idx < focusableWidgets.length) {
                    focusableWidgets.forEach(w => (w.isFocused = false));
                    focusableWidgets[idx].isFocused = true;
                    _focusedIdx = idx;
                }
            });
            _unsubBlur = appInstance.focus.on('blur', (evt) => {
                const idx = parseInt(evt.targetId.replace('quick-', ''), 10);
                if (!isNaN(idx) && idx < focusableWidgets.length) {
                    focusableWidgets[idx].isFocused = false;
                }
            });
        }

        // ── Wire up key events: dispatch to focused widget + handle app bindings ──
        const _unsubKey = appInstance.events.on('key', (event: KeyEvent) => {
            // 1. Always handle Ctrl+C — cannot be overridden by user bindings
            if (event.ctrl && event.key === 'c') {
                appInstance.exit();
                return;
            }

            // 2. Check app-level key bindings (support modifier-aware tokens)
            // Build normalized token: prefixed modifiers (ctrl, alt, shift) in that order
            const modParts: string[] = [];
            if (event.ctrl) modParts.push('ctrl');
            if (event.alt) modParts.push('alt');
            if (event.shift) modParts.push('shift');
            const baseKey = String(event.key).toLowerCase();
            const modToken = modParts.length > 0 ? `${modParts.join('+')}+${baseKey}` : baseKey;

            // Lookup order: modifier-specific token first, then exact plain key,
            // then lowercase plain-key fallback for backward compatibility.
            const action = this._keyMap[modToken] ?? this._keyMap[event.key] ?? this._keyMap[baseKey];
            if (action) {
                if (action === 'quit') {
                    appInstance.exit();
                    return;
                } else if (action === 'refresh') {
                    this._refreshReactiveWidgets(root);
                    appInstance.requestRender();
                    return;
                } else if (typeof action === 'function') {
                    action();
                    appInstance.requestRender();
                    return;
                }
            }

            // 3. Tab cycles focus between focusable widgets
            if (event.key === 'tab' && focusableWidgets.length > 1) {
                if (event.shift) {
                    appInstance.focus.focusPrev();
                } else {
                    appInstance.focus.focusNext();
                }
                appInstance.requestRender();
                return;
            }

            // 4. Dispatch key to the currently focused widget
            if (_focusedIdx >= 0 && _focusedIdx < focusableWidgets.length) {
                const focused = focusableWidgets[_focusedIdx];

                if (focused instanceof List) {
                    switch (event.key) {
                        case 'up':
                        case 'k':
                            focused.selectPrev();
                            break;
                        case 'down':
                        case 'j':
                            focused.selectNext();
                            break;
                        case 'enter':
                        case ' ':
                            focused.confirm();
                            break;
                        default:
                            return; // Don't re-render for unhandled keys
                    }
                    appInstance.requestRender();
                    return;
                }

                if (focused instanceof TextInput) {
                    switch (event.key) {
                        case 'left':
                            focused.moveCursorLeft();
                            break;
                        case 'right':
                            focused.moveCursorRight();
                            break;
                        case 'backspace':
                            focused.deleteBack();
                            break;
                        case 'delete':
                            focused.deleteForward();
                            break;
                        case 'home':
                            focused.moveCursorHome();
                            break;
                        case 'end':
                            focused.moveCursorEnd();
                            break;
                        case 'enter':
                            focused.submit();
                            focused.clear();
                            break;
                        default:
                            // Printable character
                            if (event.key.length === 1 && !event.ctrl && !event.alt) {
                                focused.insertChar(event.key);
                            }
                            break;
                    }
                    appInstance.requestRender();
                    return;
                }
            }
        });

        // Set up auto-refresh
        let refreshTimer: ReturnType<typeof setInterval> | null = null;
        if (this._refreshInterval) {
            refreshTimer = setInterval(() => {
                try {
                    this._refreshReactiveWidgets(root);
                    appInstance.requestRender();
                } catch (err) {
                    // Reactive widget error — don't crash the process
                    this._onError?.(err);
                }
            }, this._refreshInterval);
        }

        // Clean up on exit
        const origExit = appInstance.exit.bind(appInstance);
        appInstance.exit = (code?: number) => {
            if (refreshTimer) clearInterval(refreshTimer);
            _unsubFocus?.();
            _unsubBlur?.();
            _unsubKey();
            origExit(code);
        };

        return appInstance.mount();
    }

    /**
     * Walk the widget tree and update any reactive values.
     */
    private _refreshReactiveWidgets(widget: Widget): void {
        try {
            const w = widget as any; // as any: reactive metadata is monkey-patched onto Widget instances in widgets.ts

            // Text — reactive content
            if (widget instanceof Text && w.__reactiveContent) {
                widget.setContent(resolve(w.__reactiveContent));
            }

            // Gauge — reactive value
            if (widget instanceof Gauge && w.__reactiveValue) {
                widget.setValue(resolve(w.__reactiveValue));
            }

            // Table — reactive data
            if (widget instanceof Table && w.__reactiveData) {
                const data: Record<string, string | number>[] = resolve(w.__reactiveData);
                widget.setRows(data);
            }

            // Sparkline — reactive data
            if (widget instanceof Sparkline && w.__reactiveData) {
                widget.setData(resolve(w.__reactiveData));
            }

            // StatusIndicator — reactive status
            if (widget instanceof StatusIndicator && w.__reactiveStatus) {
                widget.setStatus(resolve(w.__reactiveStatus));
            }

            // LogView — reactive lines
            if (widget instanceof LogView && w.__reactiveLines) {
                widget.setLines(resolve(w.__reactiveLines));
            }

            // List — reactive items
            if (widget instanceof List && w.__reactiveItems) {
                const items: string[] = resolve(w.__reactiveItems);
                widget.setItems(items.map(label => ({ label, value: label })));
            }

            // BarChart — reactive data
            if (widget instanceof BarChart && w.__reactiveBarData) {
                widget.setData(resolve(w.__reactiveBarData));
            }

            // ProgressBar — reactive value
            if (widget instanceof ProgressBar && w.__reactiveValue) {
                widget.setValue(resolve(w.__reactiveValue));
            }

            // Tree — reactive nodes (if data changes)
            if (widget instanceof Tree && w.__reactiveTreeNodes) {
                widget.setNodes(resolve(w.__reactiveTreeNodes));
            }

            // MultiProgress — reactive items
            if (widget instanceof MultiProgress && w.__reactiveMultiItems) {
                const items: ProgressItem[] = resolve(w.__reactiveMultiItems);
                widget.setItems(items);
            }

            // Recurse into children
            for (const child of widget.children) {
                this._refreshReactiveWidgets(child);
            }
        } catch (err) {
            // Reactive widget error — don't crash the process
            console.error('[quick] reactive widget error:', err);
        }
    }
}

/**
 * Create a new TermUI app with a fluent builder API.
 *
 * @example
 * ```ts
 * import { app, row, gauge } from '@termuijs/quick';
 * import { cpu, memory } from '@termuijs/data';
 *
 * app('System Monitor')
 *   .rows(
 *     row(gauge('CPU', () => cpu.percent / 100)),
 *     row(gauge('Memory', () => memory.percent / 100)),
 *   )
 *   .keys({ q: 'quit' })
 *   .refresh('1s')
 *   .run();
 * ```
 */
export function app(title: string): AppBuilder {
    return new AppBuilder(title);
}
