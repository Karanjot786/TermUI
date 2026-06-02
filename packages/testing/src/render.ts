// ─────────────────────────────────────────────────────
// @termuijs/testing — Test Renderer
//
// Renders a JSX component tree into an in-memory
// screen buffer for testing. Supports querying the
// rendered output and simulating user interactions.
// ─────────────────────────────────────────────────────

import { Screen, type KeyEvent } from '@termuijs/core';
import { Box, Text, Widget } from '@termuijs/widgets';
import {
    reconcile, reRenderComponent, unmountAll, setRequestRender, getRequestRender,
    collectInputHandlers, destroyFiber, type VNode,
} from '@termuijs/jsx';

/**
 * The result of rendering a component tree for testing.
 */
export interface TestInstance {
    /** The root Box container wrapping the component output */
    container: Box;
    /** The in-memory screen buffer */
    screen: Screen;

    /** Get all rendered text as a single string */
    toString(): string;

    /** Get the last rendered frame as an array of strings (one per row) */
    lastFrame(): string[];

    /**
     * Find a widget whose text content includes the given string.
     * Returns null if not found.
     */
    getByText(text: string): Widget | null;

    /**
     * Find all widgets whose text content includes the given string.
     */
    getAllByText(text: string): Widget[];

    /**
     * Find all widgets of a specific type (by constructor).
     */
    getAllByType<T extends Widget>(type: new (...args: any[]) => T): T[];

    /**
     * Simulate a key press event. This dispatches to useInput handlers.
     */
    fireKey(key: string, modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }): void;

    /**
     * Type a string — fires each character as a key event.
     */
    typeText(text: string): void;

    /**
     * Force a re-render of the component tree.
     */
    rerender(element?: VNode): void;

    /**
     * Wait for an assertion to pass within a timeout.
     * Retries fn every interval ms until it stops throwing or the timeout elapses.
     */
    waitFor(fn: () => void, opts?: { timeout?: number; interval?: number }): Promise<void>;

    /**
     * Render the current screen buffer to a plain string.
     * Each non-empty row is joined with newlines.
     */
    renderToString(): string;

    /**
     * Unmount and clean up all component instances.
     */
    unmount(): void;
}

/**
 * Options for test rendering.
 */
export interface TestRenderOptions {
    /** Terminal width in columns (default: 80) */
    width?: number;
    /** Terminal height in rows (default: 24) */
    height?: number;
}

// ── Helpers ──

/** Recursively walk a widget tree, collecting matching widgets */
function walkWidgets(root: Widget, predicate: (w: Widget) => boolean): Widget[] {
    const result: Widget[] = [];
    const stack: Widget[] = [root];
    while (stack.length > 0) {
        const w = stack.pop()!;
        if (predicate(w)) result.push(w);
        // Push children in reverse so we process left-to-right
        const children: Widget[] = (w as any)._children ?? [];
        for (let i = children.length - 1; i >= 0; i--) {
            stack.push(children[i]);
        }
    }
    return result;
}

/** Extract text content from a Text widget */
function getTextContent(widget: Widget): string {
    if (widget instanceof Text) {
        return (widget as any)._content ?? '';
    }
    return '';
}

/** Render the widget tree to the screen buffer */
function renderToScreen(container: Box, screen: Screen): void {
    // Set the root rect to fill the screen
    (container as any)._rect = { x: 0, y: 0, width: screen.cols, height: screen.rows };

    // Simple vertical stacking layout for testing
    assignRects(container, 0, 0, screen.cols, screen.rows);

    // Clear and render
    screen.clear();
    (container as any)._renderSelf?.(screen);
    renderChildren(container, screen);
}

/** Simple recursive layout: stack children vertically */
function assignRects(widget: Widget, x: number, y: number, width: number, height: number): void {
    (widget as any)._rect = { x, y, width, height };
    const children: Widget[] = (widget as any)._children ?? [];
    if (children.length === 0) return;
    const childHeight = Math.max(1, Math.floor(height / children.length));
    let currentY = y;
    for (const child of children) {
        assignRects(child, x, currentY, width, childHeight);
        currentY += childHeight;
    }
}

function renderChildren(parent: Widget, screen: Screen): void {
    const children: Widget[] = (parent as any)._children ?? [];
    for (const child of children) {
        (child as any)._renderSelf?.(screen);
        renderChildren(child, screen);
    }
}

/** Read all screen rows as strings */
function readScreenLines(screen: Screen): string[] {
    const lines: string[] = [];
    for (let row = 0; row < screen.rows; row++) {
        let line = '';
        for (let col = 0; col < screen.cols; col++) {
            const cell = screen.back[row]?.[col];
            line += cell?.char ?? ' ';
        }
        lines.push(line.trimEnd());
    }
    return lines;
}

// ── Main API ──

/**
 * Render a JSX component tree into an in-memory test instance.
 *
 * ```tsx
 * import { render } from '@termuijs/testing';
 * import { useState, useInput } from '@termuijs/jsx';
 *
 * function Counter() {
 *     const [count, setCount] = useState(0);
 *     useInput((key) => { if (key === '+') setCount(c => c + 1); });
 *     return <Text>Count: {count}</Text>;
 * }
 *
 * const t = render(<Counter />);
 * expect(t.getByText('Count: 0')).toBeTruthy();
 * t.fireKey('+');
 * expect(t.getByText('Count: 1')).toBeTruthy();
 * t.unmount();
 * ```
 */
export function render(element: VNode, options: TestRenderOptions = {}): TestInstance {
    const width = options.width ?? 80;
    const height = options.height ?? 24;
    const screen = new Screen(width, height);

    let currentElement = element;

    // Build the initial widget tree
    let rootWidget = reconcile(currentElement);

    // Wrap in a root container
    const container = new Box({
        flexDirection: 'column',
        width: '100%',
        height: '100%',
    });
    container.addChild(rootWidget);

    // Save caller's render callback so we can restore it on unmount
    const prevRender = getRequestRender();

    // Set up re-render callback — use fiber-preserving reRenderComponent
    setRequestRender(() => {
        const instances: Map<Widget, any> = (globalThis as any).__termuijs_instances;
        const rootInstance = instances?.get(rootWidget);
        if (rootInstance) {
            const newRoot = reRenderComponent(rootInstance);
            container.clearChildren();
            container.addChild(newRoot);
            rootWidget = newRoot;
        } else {
            const newRoot = reconcile(currentElement);
            container.clearChildren();
            container.addChild(newRoot);
            rootWidget = newRoot;
        }
        renderToScreen(container, screen);
    });

    // Initial render
    renderToScreen(container, screen);

    const instance: TestInstance = {
        container,
        screen,

        toString(): string {
            return readScreenLines(screen).filter(l => l.length > 0).join('\n');
        },

        lastFrame(): string[] {
            return readScreenLines(screen);
        },

        getByText(text: string): Widget | null {
            // Check widget tree for Text widgets
            const matches = walkWidgets(container, (w) => {
                if (w instanceof Text) {
                    return getTextContent(w).includes(text);
                }
                return false;
            });
            if (matches.length > 0) return matches[0];

            // Fallback: check screen buffer
            const screenText = readScreenLines(screen).join('\n');
            if (screenText.includes(text)) {
                return container;
            }
            return null;
        },

        getAllByText(text: string): Widget[] {
            return walkWidgets(container, (w) => {
                if (w instanceof Text) {
                    return getTextContent(w).includes(text);
                }
                return false;
            });
        },

        getAllByType<T extends Widget>(type: new (...args: any[]) => T): T[] {
            return walkWidgets(container, (w) => w instanceof type) as T[];
        },

        fireKey(key: string, modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }): void {
            const event: KeyEvent = {
                key,
                ctrl: modifiers?.ctrl ?? false,
                shift: modifiers?.shift ?? false,
                alt: modifiers?.alt ?? false,
                raw: Buffer.from(key),
                stopPropagation() { this._propagationStopped = true; },
                preventDefault() { this._defaultPrevented = true; },
            };

            const instances: Map<Widget, any> = (globalThis as any).__termuijs_instances;
            const rootInstance = instances?.get(rootWidget);
            if (rootInstance?.fiber) {
                for (const handler of collectInputHandlers(rootInstance.fiber)) {
                    handler(event);
                }
                // setState updates hookState.value synchronously but schedules the
                // re-render via queueMicrotask. Flush now so renderToString() is current.
                const newRoot = reRenderComponent(rootInstance);
                container.clearChildren();
                container.addChild(newRoot);
                rootWidget = newRoot;
                renderToScreen(container, screen);
            }
        },

        typeText(text: string): void {
            for (const char of text) {
                instance.fireKey(char);
            }
        },

        rerender(el?: VNode): void {
            if (el) {
                // New element provided: reconcile fresh so new props take effect.
                // reRenderComponent re-uses stored props and would ignore the new element.
                currentElement = el;
                const newRoot = reconcile(currentElement);
                container.clearChildren();
                container.addChild(newRoot);
                rootWidget = newRoot;
                renderToScreen(container, screen);
            } else {
                // No new element: re-render existing fiber, preserving state.
                const instances: Map<Widget, any> = (globalThis as any).__termuijs_instances;
                const rootInstance = instances?.get(rootWidget);
                if (rootInstance) {
                    const newRoot = reRenderComponent(rootInstance);
                    container.clearChildren();
                    container.addChild(newRoot);
                    rootWidget = newRoot;
                    renderToScreen(container, screen);
                } else {
                    console.warn('[testing] rerender() called but no fiber instance or element available');
                }
            }
        },

        async waitFor(fn: () => void, opts = { timeout: 1000, interval: 10 }): Promise<void> {
            const timeout = opts.timeout ?? 1000;
            const interval = opts.interval ?? 10;
            const deadline = Date.now() + timeout;
            let lastError: unknown;
            while (Date.now() < deadline) {
                try {
                    fn();
                    return;
                } catch (err) {
                    lastError = err;
                    await new Promise(r => setTimeout(r, interval));
                }
            }
            // Wrap with timeout context
            const msg = lastError instanceof Error ? lastError.message : String(lastError);
            throw new Error(`waitFor timed out after ${timeout}ms: ${msg}`);
        },

        renderToString(): string {
            return this.toString();
        },

        unmount(): void {
            // Restore the caller's render callback (don't leave a stale test callback)
            setRequestRender(prevRender);
            // Destroy only this test's root fiber — don't wipe the whole app
            const instances: Map<Widget, any> = (globalThis as any).__termuijs_instances;
            const rootInstance = instances?.get(rootWidget);
            if (rootInstance?.fiber) {
                destroyFiber(rootInstance.fiber);
            }
            instances?.delete(rootWidget);
        },
    };

    return instance;
}
