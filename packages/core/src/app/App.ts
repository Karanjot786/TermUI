// ─────────────────────────────────────────────────────
// @termuijs/core — Application lifecycle manager
// ─────────────────────────────────────────────────────

import { Terminal, type TerminalOptions } from '../terminal/Terminal.js';
import { Screen } from '../terminal/Screen.js';
import { Renderer } from '../terminal/Renderer.js';
import { LayerManager } from '../terminal/LayerManager.js';
import { InputParser } from '../input/InputParser.js';
import { FocusManager } from '../events/FocusManager.js';
import { EventEmitter } from '../events/EventEmitter.js';
import { computeLayout, type LayoutNode } from '../layout/LayoutEngine.js';
import type { EventMap } from '../events/types.js';
import { createKeyEvent } from '../events/types.js';
import { renderFallback, shouldUseFallback } from './Fallback.js';
import { mergeBorders } from '../renderer/border-merge.js';
import { renderInlineToTerminal } from '../inline-viewport.js';

export interface AppOptions extends TerminalOptions {
    /** Frames per second for the render loop */
    fps?: number;
    /** Use alternate screen (full-screen mode). Default: true */
    fullscreen?: boolean;
    /** Merge adjacent borders into junction characters */
    dockBorders?: boolean;
    /** Screen mode: 'alternate' = alt screen (default), 'main' = render to main screen, 'inline' = render N rows at cursor */
    screenMode?: 'alternate' | 'main' | 'inline';
    /** Number of rows to render in inline mode (only used when screenMode='inline') */
    inlineRows?: number;
    /** Enable mouse support. Default: false */
    mouse?: boolean;
    /** Force fallback (static) rendering */
    forceFallback?: boolean;
    /** Skip fallback detection — always run interactively. Default: false */
    skipFallback?: boolean;
    /** Title to set on the terminal window */
    title?: string;
    diffRenderer?: boolean;
}

/**
 * Widget interface that App expects for the root widget.
 * This is the minimum contract — the full Widget class in @termuijs/widgets extends this.
 */
export interface RootWidget {
    id: string;
    getLayoutNode(): LayoutNode;
    syncLayout?(): void;
    render(screen: Screen): void;
    mount?(): void;
    unmount?(): void;
    /** Check if this widget needs re-rendering (dirty flag) */
    isDirty?: boolean;
    /** Clear the dirty flag after rendering */
    clearDirty?(): void;
}

/**
 * Application lifecycle manager.
 *
 * Manages:
 * - Terminal setup/teardown (alt screen, raw mode, cursor, mouse)
 * - Screen buffer and renderer initialization
 * - Input parsing and event dispatch
 * - Layout computation and rect sync
 * - Render loop
 * - Graceful shutdown
 */
export class App {
    readonly terminal: Terminal;
    readonly screen: Screen;
    readonly renderer: Renderer;
    readonly input: InputParser;
    readonly focus: FocusManager;
    readonly events: EventEmitter<EventMap>;
    readonly layers: LayerManager;

    private _rootWidget: RootWidget;
    private _options: AppOptions;
    private _mounted = false;
    private _exitResolve: ((code: number) => void) | null = null;
    private _unsubKey: (() => void) | null = null;
    private _unsubMouse: (() => void) | null = null;
    private _widgetById = new Map<string, any>();
    // Lines to insert before inline viewport output. Each entry: { id: symbol, text: string }
    private _insertBefore: Array<{ id: symbol; text: string }> = [];

    constructor(rootWidget: RootWidget, options: AppOptions = {}) {
        this._rootWidget = rootWidget;
        this._options = {
            fullscreen: true,
            mouse: false,
            fps: 30,
            dockBorders: false,
            diffRenderer: true,
            // Default screenMode: if fullscreen explicitly disabled, treat as 'main', otherwise 'alternate'
            screenMode: options.fullscreen === false ? 'main' : 'alternate',
            inlineRows: 0,
            ...options,
        };

        this.terminal = new Terminal(options);
        this.screen = new Screen(this.terminal.cols, this.terminal.rows);
        this.renderer = new Renderer(this.terminal, this.screen, this._options.fps, this._options.diffRenderer);
        this.input = new InputParser(this.terminal.stdin);
        this.focus = new FocusManager();
        this.events = new EventEmitter();
        this.layers = new LayerManager(this.terminal.cols, this.terminal.rows);
    }

    /**
     * Start the application.
     * Sets up the terminal, starts the render loop, and mounts the root widget.
     * Returns a promise that resolves when exit() is called.
     */
    async mount(): Promise<number> {
        if (this._mounted) return 0;

        // Check if we should use fallback mode
        if (this._options.forceFallback || (!this._options.skipFallback && shouldUseFallback())) {
            this._renderFallback();
            return 0;
        }

        this._mounted = true;

        // Start the stdout interceptor right before UI rendering begins
        this.renderer.hook.start();

        // Set up terminal
        this.terminal.enterRawMode();
        // Enter alternate screen only when requested via screenMode === 'alternate'
        if (this._options.screenMode === 'alternate') {
            this.terminal.enterAltScreen();
        }
        this.terminal.hideCursor();

        if (this._options.mouse) {
            this.terminal.enableMouse();
        }

        if (this._options.title) {
            this.terminal.write(`\x1b]0;${this._options.title}\x07`);
        }

        // Handle resize
        this.terminal.onResize((cols, rows) => {
            this.screen.resize(cols, rows);
            this.screen.invalidate();
            this.layers.resize(cols, rows);
            this.events.emit('resize', { cols, rows });
            (this._rootWidget as any).markDirty?.();
            this.requestRender();
        });

        // Set up input handling
        this.input.start();

        // Forward key events with bubble dispatch
        this._unsubKey = this.input.onKey((rawEvent) => {
            const event = createKeyEvent({
                ...rawEvent,
                targetId: this.focus.currentId ?? undefined,
            });

            // Phase 1: Bubble dispatch — focused widget → parent → root
            const focusedId = this.focus.currentId;
            if (focusedId) {
                const chain = this._buildBubbleChain(focusedId);
                for (const widget of chain) {
                    widget.events.emit('key', event);
                    if (event._propagationStopped) break;
                }
            }

            // Phase 2: Default actions (Tab for focus cycling)
            if (!event._defaultPrevented) {
                if (event.key === 'tab' && !event.ctrl && !event.alt) {
                    if (event.shift) {
                        this.focus.focusPrev();
                    } else {
                        this.focus.focusNext();
                    }
                }
            }

            // Phase 3: App-level broadcast (always fires unless stopped)
            if (!event._propagationStopped) {
                this.events.emit('key', event);
            }
        });

        // Forward mouse events
        this._unsubMouse = this.input.onMouse((event) => {
            this.events.emit('mouse', event);
        });

        // Start render loop — tick drives requestRender() so dirty widgets
        // (motion, timers) get redrawn without a separate setInterval.
        this.renderer.start(() => this.requestRender());

        // Mount root widget
        this._rootWidget.mount?.();
        this.events.emit('mount', undefined as any);

        // Initial render — invalidate front buffer to force full redraw
        this.screen.invalidate();
        this.requestRender();

        // Block until exit() is called
        return new Promise<number>((resolve) => {
            this._exitResolve = resolve;
        });
    }

    /**
     * Stop the application and restore terminal state.
     */
    unmount(exitCode: number = 0): void {
        if (!this._mounted) return;
        this._mounted = false;

        this._rootWidget.unmount?.();
        this.events.emit('unmount', undefined as any);

        this._unsubKey?.();
        this._unsubKey = null;
        this._unsubMouse?.();
        this._unsubMouse = null;

        // Stop the stdout interceptor to restore native console.log behavior
        this.renderer.hook.stop();

        this.renderer.stop();
        this.input.stop();
        this.terminal.restore();
        this.events.removeAll();

        if (this._exitResolve) {
            this._exitResolve(exitCode);
            this._exitResolve = null;
        }
    }

    /**
     * Create an overlay layer for rendering above normal widgets.
     * @param id     Unique layer identifier (e.g. 'modal', 'select-dropdown', 'toast')
     * @param zIndex Stacking order (higher = rendered on top). Default: 100
     */
    addOverlay(id: string, zIndex = 100): void {
        this.layers.createLayer(id, zIndex);
    }

    /**
     * Remove an overlay layer.
     */
    removeOverlay(id: string): void {
        this.layers.removeLayer(id);
    }

    /**
     * Request a re-render on the next frame.
     * Skips layout + render pass when the root widget reports no dirty state.
     */
    requestRender(): void {
        if (!this._mounted) return;

        // Skip full layout pass if widget tree reports nothing has changed.
        // isDirty propagates upward via markDirty(), so the root being clean
        // means no descendant needs re-rendering either.
        // Do NOT call requestFrame() here — back buffer is stale after swap()
        // and flushing it would write old content over the current display.
        if (this._rootWidget.isDirty === false) {
            return;
        }

        // Compute layout
        const layoutRoot = this._rootWidget.getLayoutNode();
        computeLayout(layoutRoot, this.terminal.cols, this.terminal.rows);

        // Sync computed rects from layout tree back to widgets
        this._rootWidget.syncLayout?.();

        // Rebuild the widget ID cache so _buildBubbleChain can do O(1) lookups
        this._buildWidgetMap(this._rootWidget);

        // Clear the back buffer and render widgets into it
        this.screen.clear();
        this._rootWidget.render(this.screen);

        // Clear dirty flags now that we've rendered — future requestRender()
        // calls will skip layout until markDirty() is called again.
        this._rootWidget.clearDirty?.();
        // Merge adjacent borders into junction characters for a cleaner look
        if (this._options.dockBorders) {
           mergeBorders(this.screen);
        }
        // Composite overlay layers on top of the base rendering
        this.layers.composite(this.screen);

        // Inline rendering bypasses the differential renderer and writes
        // the bottom N rows directly into the main buffer so scrollback
        // is preserved. It also emits any registered `insertBefore` lines
        // above the live UI.
        if (this._options.screenMode === 'inline') {
            // Render any insertBefore lines first
            for (const item of this._insertBefore) {
                this.terminal.write(item.text + '\n');
            }
            // Render bottom N rows as plain text
            // Ensure we pass an object with a `write` method. Support Terminal instance
            // or raw stdout-like streams used in tests.
            const writer = (this.terminal && typeof (this.terminal as any).write === 'function')
                ? (this.terminal as any)
                : { write: (s: string) => (this.terminal as any).stdout.write(s) };
            renderInlineToTerminal(writer, this.screen as any, this._options.inlineRows ?? 0);
            return;
        }

        this.renderer.requestFrame();
    }

    /**
     * Exit the app (convenience method).
     */
    exit(code = 0): void {
        this.unmount(code);
        if (this._exitResolve) {
            this._exitResolve(code);
            this._exitResolve = null;
        }
    }

    /**
     * Register a persistent line to be written above inline viewport output.
     * Returns an unregister function.
     */
    insertBefore(line: string): () => void {
        const id = Symbol();
        this._insertBefore.push({ id, text: line });
        return () => {
            const idx = this._insertBefore.findIndex(x => x.id === id);
            if (idx >= 0) this._insertBefore.splice(idx, 1);
        };
    }

    /**
     * Render in fallback (static) mode for non-interactive environments.
     */
    private _renderFallback(): void {
        const layoutRoot = this._rootWidget.getLayoutNode();
        computeLayout(layoutRoot, this.terminal.cols, this.terminal.rows);

        this._rootWidget.syncLayout?.();

        this.screen.clear();
        this._rootWidget.render(this.screen);

        const output = renderFallback(this.screen);
        this.terminal.write(output + '\n');
    }

    /**
     * Build the bubble chain for keyboard events.
     * Returns an array: [focused widget, parent, grandparent, ..., root]
     * Uses the cached _widgetById map for O(1) lookup instead of DFS.
     */
    private _buildBubbleChain(widgetId: string): Array<{ events: { emit: (event: string, data: any) => void } }> {
        const chain: Array<{ events: { emit: (event: string, data: any) => void } }> = [];
        const widget = this._widgetById.get(widgetId);  // O(1) lookup
        if (!widget) return chain;

        let current: any = widget;
        while (current) {
            if (current.events) {
                chain.push(current);
            }
            current = current.parent ?? null;
        }
        return chain;
    }

    /**
     * Rebuild the widget ID cache by walking the entire widget tree.
     * Called after syncLayout() so the map stays current.
     */
    private _buildWidgetMap(root: any): void {
        this._widgetById.clear();
        this._walkWidget(root);
    }

    private _walkWidget(widget: any): void {
        if (!widget) return;
        if (widget.id) this._widgetById.set(widget.id, widget);
        const children = widget._children ?? widget.children ?? [];
        if (Array.isArray(children)) {
            for (const child of children) {
                this._walkWidget(child);
            }
        }
    }
}