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
import type { EventMap, FocusEvent } from '../events/types.js';
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

interface FocusAwareWidget {
    id: string;
    isFocused: boolean;
    markDirty?: () => void;
}

/**
 * Application lifecycle manager.
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
    private _unsubPaste: (() => void) | null = null;
    private _unsubFocus: (() => void) | null = null;
    private _unsubBlur: (() => void) | null = null;
    private _unsubSigInt: (() => void) | null = null;
    private _unsubSigTerm: (() => void) | null = null;
    private _unsubUncaughtException: (() => void) | null = null;
    private _unsubUnhandledRejection: (() => void) | null = null;
    private _widgetById = new Map<string, any>();
    private _pendingFocusState = new Map<string, boolean>();

    private _consecutiveRenderFailures = 0;
    private static readonly MAX_RENDER_FAILURES = 5;

    // Lines to insert before inline viewport output. Each entry: { id: symbol, text: string }
    private _insertBefore: Array<{ id: symbol; text: string }> = [];

    // Core fix patch: Track if a paint task has been queued for the next event loop tick
    private _isRenderPending = false;

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
     */
    async mount(): Promise<number> {
        if (this._mounted) return 0;

        // Check if we should use fallback mode
        if (this._options.forceFallback || (!this._options.skipFallback && shouldUseFallback())) {
            this._renderFallback();
            return 0;
        }

        this._mounted = true;
        // Focus subscriptions are interactive-only; fallback mount returns
        // without unmount(), so constructor subscriptions would leak there.
        this._subscribeFocusEvents();

        const focusedId = this.focus.currentId;
        if (focusedId) {
            // Focusables may register before mount and auto-focus before the
            // widget map exists. Replay that state after the first map rebuild.
            this._pendingFocusState.set(focusedId, true);
        }

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

        // Forward paste events
        this._unsubPaste = this.input.onPaste((text) => {
            this.events.emit('paste', text);
        });

        // Handle signals to ensure hook cleanup on forced exit
        const onSigInt = (): void => { this.exit(130); };
        const onSigTerm = (): void => { this.exit(143); };
        process.on('SIGINT', onSigInt);
        process.on('SIGTERM', onSigTerm);
        this._unsubSigInt = () => process.off('SIGINT', onSigInt);
        this._unsubSigTerm = () => process.off('SIGTERM', onSigTerm);

        // Register terminal cleanup to stop render hook on process exit
        this.terminal.onCleanup(() => {
            this.renderer.hook.stop();
        });

        // Handle uncaught exceptions — stop hook first so console works, then restore terminal
        const onUncaughtException = (err: Error) => {
            this.renderer.hook.stop();
            this.renderer.hook.writeRaw(this.renderer.hook.flush());
            this.renderer.hook.writeRaw(`Uncaught exception: ${err.message}\n${err.stack}\n`);
            this.terminal.restore();
            process.exit(1);
        };
        process.on('uncaughtException', onUncaughtException);
        this._unsubUncaughtException = () => process.off('uncaughtException', onUncaughtException);

        const onUnhandledRejection = (reason: any) => {
            this.renderer.hook.stop();
            this.renderer.hook.writeRaw(this.renderer.hook.flush());
            this.renderer.hook.writeRaw(`Unhandled rejection: ${reason}\n`);
            this.terminal.restore();
            process.exit(1);
        };
        process.on('unhandledRejection', onUnhandledRejection);
        this._unsubUnhandledRejection = () => process.off('unhandledRejection', onUnhandledRejection);

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

        this._unsubSigInt?.();
        this._unsubSigInt = null;
        this._unsubSigTerm?.();
        this._unsubSigTerm = null;
        this._unsubKey?.();
        this._unsubKey = null;
        this._unsubMouse?.();
        this._unsubMouse = null;

        this._unsubFocus?.();
        this._unsubFocus = null;
        this._unsubBlur?.();
        this._unsubBlur = null;
        this._unsubPaste?.();
        this._unsubPaste = null;
        this._unsubUncaughtException?.();
        this._unsubUncaughtException = null;
        this._unsubUnhandledRejection?.();
        this._unsubUnhandledRejection = null;


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
     * Batches rapid structural updates via setImmediate scheduling so that
     * multiple synchronous state mutations collapse into a single render frame.
     */
    requestRender(): void {
        if (!this._mounted) return;

        // If a render is already queued for this tick, bail out — it will
        // pick up all dirty state when it eventually runs.
        if (this._isRenderPending) return;

        // Skip full render pass if neither the widget tree nor overlay layers
        // have reported any changes.
        if (this._rootWidget.isDirty === false && !this.layers.hasDirtyLayers()) {
            return;
        }

        this._isRenderPending = true;

        // Defer rendering to the end of the current macro-task poll pool.
        // This guarantees that multiple state updates called synchronously
        // collapse into a single render frame.
        setImmediate(() => {
            if (!this._mounted) {
                this._isRenderPending = false;
                return;
            }

            try {
                if (this._rootWidget.isDirty !== false) {
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

                    // Merge adjacent borders into junction characters for a cleaner look
                    if (this._options.dockBorders) {
                        mergeBorders(this.screen);
                    }

                    // Clear dirty flags on the widget tree
                    this._rootWidget.clearDirty?.();
                }

                // Composite overlay layers on top of the base rendering.
                // Runs even when only layers are dirty (root widget is clean).
                this.layers.composite(this.screen);

                // Inline rendering bypasses the differential renderer and writes
                // the bottom N rows directly into the main buffer so scrollback is preserved.
                if (this._options.screenMode === 'inline') {
                    for (const item of this._insertBefore) {
                        this.terminal.write(item.text + '\n');
                    }
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        const mod = require('../inline-viewport.js');
                        const renderInlineToTerminal = mod.renderInlineToTerminal ?? mod.default?.renderInlineToTerminal;
                        if (typeof renderInlineToTerminal === 'function') {
                            const writer = (this.terminal && typeof (this.terminal as any).write === 'function')
                                ? (this.terminal as any)
                                : { write: (s: string) => (this.terminal as any).stdout.write(s) };
                            renderInlineToTerminal(writer, this.screen as any, this._options.inlineRows ?? 0);
                        }
                    } catch (_e) {
                        // Fallback: write nothing
                    }
                } else {
                    this.renderer.requestFrame();
                }
            } finally {
                // Unlock the queue flag so subsequent frames can be scheduled
                this._isRenderPending = false;
                // Re-schedule if a widget became dirty during the render cycle —
                // the previous early-return on _isRenderPending would have silently
                // dropped that state change. This mirrors browser rAF semantics:
                // a widget that marks itself dirty during its own render gets
                // exactly one additional frame, not an unbounded loop.
                if (this._rootWidget.isDirty === true) {
                    this.requestRender();
                }
            }
        });
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
     * Read from the system clipboard.
     */
    readClipboard(): Promise<string> {
        return this.terminal.readClipboard();
    }

    /**
     * Write to the system clipboard.
     */
    writeClipboard(text: string): void {
        this.terminal.writeClipboard(text);
    }

    /**
     * Register a persistent line to be written above inline viewport output.
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
     */
    private _buildBubbleChain(widgetId: string): Array<{ events: { emit: (event: string, data: any) => void } }> {
        const chain: Array<{ events: { emit: (event: string, data: any) => void } }> = [];
        const widget = this._widgetById.get(widgetId);
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
     */
    private _buildWidgetMap(root: any): void {
        this._widgetById.clear();
        this._walkWidget(root);
        // Pending focus events are safe to apply once widget IDs are registered.
        this._applyPendingFocusState();
    }

    private _walkWidget(widget: any): void {
        if (!widget) return;
        if (widget.id) {
            this._widgetById.set(widget.id, widget);
        }
        const children = widget._children ?? widget.children ?? [];
        if (Array.isArray(children)) {
            for (const child of children) {
                this._walkWidget(child);
            }
        }
    }

    private _handleFocusEvent(event: FocusEvent): void {
        const focused = event.type === 'focus';
        const changed = this._setWidgetFocused(event.targetId, focused);
        if (changed === null) {
            // The first focus event can arrive before requestRender() builds
            // _widgetById, so hold it until the next completed map rebuild.
            this._pendingFocusState.set(event.targetId, focused);
            return;
        }
        if (changed) {
            this.requestRender();
        }
    }

    private _setWidgetFocused(id: string, focused: boolean): boolean | null {
        const widget = this._widgetById.get(id);
        if (!widget) {
            return null;
        }
        if (!this._isFocusAwareWidget(widget) || widget.isFocused === focused) {
            return false;
        }

        widget.isFocused = focused;
        widget.markDirty?.();
        return true;
    }

    private _subscribeFocusEvents(): void {
        if (!this._unsubFocus) {
            this._unsubFocus = this.focus.on('focus', event => this._handleFocusEvent(event));
        }
        if (!this._unsubBlur) {
            this._unsubBlur = this.focus.on('blur', event => this._handleFocusEvent(event));
        }
    }

    private _applyPendingFocusState(): void {
        for (const [id, focused] of this._pendingFocusState) {
            // FocusManager emits blur before focus, and both events run before
            // rendering rebuilds the map, so the old widget is still available.
            const stateChanged = this._setWidgetFocused(id, focused);
            if (stateChanged !== null) {
                this._pendingFocusState.delete(id);
            }
        }
    }

    private _isFocusAwareWidget(widget: unknown): widget is FocusAwareWidget {
        return typeof widget === 'object'
            && widget !== null
            && 'id' in widget
            && typeof widget.id === 'string'
            && 'isFocused' in widget
            && typeof widget.isFocused === 'boolean';
    }
}
