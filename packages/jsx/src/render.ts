// ─────────────────────────────────────────────────────
// @termuijs/jsx — render() entry point
//
// This is the top-level API. Users call:
//   render(<App />);
// to mount a component tree into a terminal App.
// ─────────────────────────────────────────────────────

import { App, type KeyEvent } from '@termuijs/core';
import { Box, Widget } from '@termuijs/widgets';
import type { VNode, FC } from './vnode.js';
import { reconcile, unmountAll, reRenderComponent } from './reconciler.js';
import { setRequestRender, setInsertBefore, collectInputHandlers } from './hooks.js';
import { createElement } from './createElement.js';
import { setCurrentApp } from './runtime.js';
import { instanceMap, activeApps } from './globals.js';

/**
 * Unmount a list of apps. Swallow any errors thrown by `unmount()` but log
 * a single error message for observability. Exported only for tests.
 */
export function unmountApps(apps: Array<{ unmount?: () => void }>): void {
    apps.forEach((app) => {
        if (typeof app.unmount === 'function') {
            try {
                app.unmount();
            } catch (err) {
                console.error('[jsx] Error during unmount():', err);
            }
        }
    });
}

export interface RenderOptions {
    /** App title shown in the title bar */
    title?: string;
    /** Use fullscreen mode (default: true) */
    fullscreen?: boolean;
    /** Exit key (default: Ctrl+C) */
    exitKey?: string;
}

/**
 * Render a JSX component tree into the terminal.
 *
 * ```tsx
 * import { render } from '@termuijs/jsx';
 *
 * function App() {
 *     const [count, setCount] = useState(0);
 *     useInput((key) => { if (key === '+') setCount(c => c + 1); });
 *     return <Text>Count: {count}</Text>;
 * }
 *
 * render(<App />);
 * ```
 */
export async function render(
    element: VNode,
    options: RenderOptions = {},
): Promise<number> {
    const {
        title,
        fullscreen = true,
        exitKey,
    } = options;

    // Build the initial widget tree from the VNode
    let rootWidget = reconcile(element);

    // Wrap in a root container
    const rootBox = new Box({
        flexDirection: 'column',
        width: '100%',
        height: '100%',
    });
    rootBox.addChild(rootWidget);

    // Create the App
    const appInstance = new App(rootBox, { fullscreen });
    setCurrentApp(appInstance);
    appInstance.terminal.onCleanup(() => {
        setCurrentApp(null);
    });
    setInsertBefore((line: string) => appInstance.insertBefore(line));
    appInstance.events.on('unmount', () => {
        setInsertBefore(null);
    });

    // Set up the re-render loop
    setRequestRender(() => {
        // Re-render from the root component instance to preserve fiber state (useState, useRef, etc.)
        // Falling back to a full reconcile only when the root instance is not found.
        const rootInstance = instanceMap.get(rootWidget);

        let newRoot: Widget;
        if (rootInstance) {
            newRoot = reRenderComponent(rootInstance);
        } else {
            newRoot = reconcile(element);
        }

        // Replace root's children
        rootBox.clearChildren();
        rootBox.addChild(newRoot);
        rootBox.markDirty();

        rootWidget = newRoot;

        // Invalidate front buffer so _flush() outputs ALL cells on next tick.
        // Without this, the differential renderer skips cells that match the
        // front buffer from the previous frame, leaving old tab content visible
        // (overlay) when switching between tabs with different layouts.
        appInstance.screen.invalidate();

        // Request a render cycle
        appInstance.requestRender();
    });

    // Handle key events — dispatch to all useInput handlers
    appInstance.events.on('key', (event: KeyEvent) => {
        // Exit key
        if (exitKey && event.key === exitKey) {
            unmountAll();
            appInstance.exit();
            return;
        }
        if (event.ctrl && event.key === 'c') {
            unmountAll();
            appInstance.exit();
            return;
        }

        // Dispatch key events via fiber tree traversal.
        // instanceMap dispatch is unreliable for pass-through components (ancestors
        // overwrite descendants' instanceMap entries). Traversing the root fiber's
        // childFibers tree finds every onInput handler regardless of nesting.
        const rootInstance = instanceMap.get(rootWidget);
        if (rootInstance?.fiber) {
            for (const handler of collectInputHandlers(rootInstance.fiber)) {
                handler(event);
            }
        }
    });

    // Register the app instance for HMR cleanups
    activeApps.push(appInstance);

    if ((import.meta as any).hot) {
        (import.meta as any).hot.accept();
        (import.meta as any).hot.dispose(() => {
            // Dynamically import dev-server to clean up apps, falling back to local inline cleanup if unavailable
            const devServerPkg = '@termuijs/dev-server';
            import(devServerPkg)
                .then(({ cleanupActiveInstances }) => {
                    cleanupActiveInstances(activeApps);
                    activeApps.length = 0;
                })
                .catch(() => {
                    // dev-server unavailable — use local helper for cleanup
                    const apps = activeApps;
                    if (Array.isArray(apps)) {
                        unmountApps(apps);
                        activeApps.length = 0;
                    }
                });
        });
    }

    // Mount and run
    return appInstance.mount();
}

/**
 * Convenience: render a functional component directly.
 *
 * ```tsx
 * import { renderApp } from '@termuijs/jsx';
 *
 * renderApp(App, { title: 'My Dashboard' });
 * ```
 */
export async function renderApp<P extends {}>(
    component: FC<P>,
    options?: RenderOptions & P,
): Promise<number> {
    const { title, fullscreen, exitKey, ...props } = (options ?? {}) as any;
    const vnode = createElement(component, props);
    return render(vnode, { title, fullscreen, exitKey });
}
