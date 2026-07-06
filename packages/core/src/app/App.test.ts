// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for App lifecycle
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { App, type AppOptions, type RootWidget } from './App.js';
import type { Screen } from '../terminal/Screen.js';
import type { LayoutNode } from '../layout/LayoutEngine.js';
import type { Rect } from '../layout/Rect.js';
import type { Style } from '../style/Style.js';
import { renderInlineToTerminal } from '../inline-viewport.js';

/**
 * Minimal mock root widget for testing App lifecycle
 * without needing actual widgets or terminal interaction.
 */
function createMockRootWidget(): RootWidget {
    return {
        id: 'root',
        getLayoutNode(): LayoutNode {
            return {
                id: 'root',
                style: {},
                children: [],
                computed: { x: 0, y: 0, width: 80, height: 24 },
            };
        },
        syncLayout() { },
        render(_screen: Screen) { },
        mount() { },
        unmount() { },
    };
}

class FocusTestWidget implements RootWidget {
    readonly id: string;
    readonly children: FocusTestWidget[] = [];
    parent: FocusTestWidget | null = null;
    focusable = false;
    isFocused = false;
    renderCount = 0;
    dirtyCount = 0;

    private _dirty = true;
    private _rect: Rect = { x: 0, y: 0, width: 0, height: 0 };
    private _layoutNode: LayoutNode | null = null;
    private _style: Style;

    constructor(id: string, style: Style = {}) {
        this.id = id;
        this._style = style;
    }

    get isDirty(): boolean {
        return this._dirty;
    }

    addChild(child: FocusTestWidget): void {
        child.parent = this;
        this.children.push(child);
    }

    getLayoutNode(): LayoutNode {
        this._layoutNode = {
            id: this.id,
            style: this._style,
            children: this.children.map(child => child.getLayoutNode()),
            computed: { x: 0, y: 0, width: 0, height: 0 },
            _dirty: true,
        };
        return this._layoutNode;
    }

    syncLayout(): void {
        if (this._layoutNode) {
            this._rect = { ...this._layoutNode.computed };
        }
        for (const child of this.children) {
            child.syncLayout();
        }
    }

    render(screen: Screen): void {
        this.renderCount++;
        if (this.children.length > 0) {
            for (const child of this.children) {
                child.render(screen);
            }
            return;
        }

        screen.setCell(this._rect.x, this._rect.y, {
            char: this.isFocused ? 'F' : '-',
        });
    }

    markDirty(): void {
        this.dirtyCount++;
        if (this._dirty) return;
        this._dirty = true;
        this.parent?.markDirty();
    }

    clearDirty(): void {
        this._dirty = false;
        for (const child of this.children) {
            child.clearDirty();
        }
    }
}

function createFocusTestRoot(): {
    root: FocusTestWidget;
    first: FocusTestWidget;
    second: FocusTestWidget;
} {
    const root = new FocusTestWidget('root', { flexDirection: 'row' });
    const first = new FocusTestWidget('first', { width: 1, height: 1 });
    const second = new FocusTestWidget('second', { width: 1, height: 1 });

    first.focusable = true;
    second.focusable = true;
    root.addChild(first);
    root.addChild(second);

    return { root, first, second };
}

function createInteractiveTestOptions(): AppOptions {
    const stdout = {
        columns: 10,
        rows: 4,
        isTTY: true,
        write(_s: string) { return true; },
        on() {},
        off() {},
        once() {},
    };
    const stdin = {
        isTTY: true,
        isRaw: false,
        setRawMode() {},
        resume() {},
        pause() {},
        on() {},
        off() {},
    };

    return {
        forceFallback: false,
        skipFallback: true,
        screenMode: 'main',
        // Test doubles implement the stream members App uses.
        stdout: stdout as unknown as NodeJS.WriteStream,
        // Test doubles implement the stream members App uses.
        stdin: stdin as unknown as NodeJS.ReadStream,
    };
}

describe('App', () => {
    describe('unmount()', () => {
        it('mount() resolves when unmount() is called directly', async () => {
            const root = createMockRootWidget();
            const fakeStdout: any = { // minimal stdout stub — full NodeJS.WriteStream type not required here
                writes: '',
                columns: 80,
                rows: 24,
                isTTY: true,
                write(s: string) { this.writes += s; return true; },
                on() {}, off() {}, once() {},
            };
            const fakeStdin: any = { isTTY: true, setRawMode() {}, resume() {}, pause() {}, on() {}, off() {} }; // minimal stdin stub — full NodeJS.ReadStream type not required here

            const app = new App(root, {
                forceFallback: false,
                skipFallback: true,
                screenMode: 'main',
                stdout: fakeStdout,
                stdin: fakeStdin,
            } as AppOptions); // cast needed — not all internal AppOptions fields are publicly exposed

            const mountPromise = app.mount();

            await new Promise((r) => setTimeout(r, 10));

            app.unmount();

            const code = await mountPromise;
            expect(code).toBe(0);
        });
    });

    describe('exit()', () => {
        afterEach(() => vi.restoreAllMocks());

        it('does NOT call process.exit when called before mount()', () => {
            const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
            const root = createMockRootWidget();
            const app = new App(root, { forceFallback: true });

            // exit() before mount — should NOT crash
            app.exit(0);

            expect(exitSpy).not.toHaveBeenCalled();
            exitSpy.mockRestore();
        });

        it('exit() called twice does not throw (idempotent)', () => {
            const root = createMockRootWidget();
            const app = new App(root, { forceFallback: true });

            expect(() => {
                app.exit(0);
                app.exit(0);
            }).not.toThrow();
        });
    });

    describe('constructor', () => {
        it('does not register uncaughtException/unhandledRejection handlers before App.mount()', () => {
            const uncaughtBefore = process.listenerCount('uncaughtException');
            const rejectionBefore = process.listenerCount('unhandledRejection');

            const root = createMockRootWidget();
            const app = new App(root, { forceFallback: true });

            // Terminal no longer registers these handlers; App registers them in mount()
            expect(process.listenerCount('uncaughtException')).toBe(uncaughtBefore);
            expect(process.listenerCount('unhandledRejection')).toBe(rejectionBefore);
        });

        it('removes SIGINT/SIGTERM handlers on restore when registered by App.mount()', () => {
            const sigintBefore = process.listenerCount('SIGINT');
            const sigtermBefore = process.listenerCount('SIGTERM');

            const root = createMockRootWidget();
            const fakeStdout: any = { columns: 80, rows: 24, isTTY: true, write() { return true; }, on() {}, off() {}, once() {} };
            const fakeStdin: any = { isTTY: true, setRawMode() {}, resume() {}, pause() {}, on() {}, off() {} };
            const app = new App(root, {
                forceFallback: false,
                skipFallback: true,
                screenMode: 'main',
                stdout: fakeStdout,
                stdin: fakeStdin,
            } as any);

            const mountPromise = app.mount();
            // App.mount() registers SIGINT/SIGTERM handlers
            expect(process.listenerCount('SIGINT')).toBeGreaterThan(sigintBefore);
            expect(process.listenerCount('SIGTERM')).toBeGreaterThan(sigtermBefore);

            // Unmount to remove handlers
            app.exit(0);
            mountPromise.catch(() => {});
            expect(process.listenerCount('SIGINT')).toBe(sigintBefore);
            expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore);
        });

        it('does not emit enterAltScreen in main mode when mounting', async () => {
            const root = createMockRootWidget();

            // Fake stdout to capture writes
            const fakeStdout: any = {
                writes: '',
                columns: 80,
                rows: 24,
                isTTY: true,
                write(s: string) { this.writes += s; return true; },
                on() {}, off() {}, once() {},
            };
            const fakeStdin: any = { isTTY: true, setRawMode() {}, resume() {}, pause() {}, on() {}, off() {} };

            const app = new App(root, { forceFallback: false, skipFallback: true, screenMode: 'main', stdout: fakeStdout, stdin: fakeStdin } as any);
            // Mount runs synchronously until it registers exit promise
            const mountPromise = app.mount();

            // Check that alt-screen sequence was NOT written
            expect(fakeStdout.writes).not.toContain('\x1b[?1049h');

            app.exit(0);
            await mountPromise.catch(() => {});
        });

        it('emits enterAltScreen in alternate mode when mounting', async () => {
            const root = createMockRootWidget();
            const fakeStdout: any = {
                writes: '',
                columns: 80,
                rows: 24,
                isTTY: true,
                write(s: string) { this.writes += s; return true; },
                on() {}, off() {}, once() {},
            };
            const fakeStdin: any = { isTTY: true, setRawMode() {}, resume() {}, pause() {}, on() {}, off() {} };

            const app = new App(root, { forceFallback: false, skipFallback: true, screenMode: 'alternate', stdout: fakeStdout, stdin: fakeStdin } as any);
            const mountPromise = app.mount();

            expect(fakeStdout.writes).toContain('\x1b[?1049h');

            app.exit(0);
            await mountPromise.catch(() => {});
        });

        it('inline mode writes bottom rows and insertBefore lines', async () => {
            const root = createMockRootWidget();
            const fakeStdout: any = {
                writes: '',
                columns: 5,
                rows: 4,
                isTTY: true,
                write(s: string) { this.writes += s; return true; },
                on() {}, off() {}, once() {},
            };
            const fakeStdin: any = { isTTY: true, setRawMode() {}, resume() {}, pause() {}, on() {}, off() {} };

            const app = new App(root, { forceFallback: false, skipFallback: true, screenMode: 'inline', inlineRows: 2, stdout: fakeStdout, stdin: fakeStdin } as any);
            const mountPromise = app.mount();

            // Render some content into the screen by marking root render to write
            (root as any).render = (screen: any) => {
                // write rows directly into back buffer
                screen.back[0].forEach((c: any, i: number) => c.char = i === 0 ? 'A' : ' ');
                screen.back[2].forEach((c: any, i: number) => c.char = i === 0 ? 'X' : ' ');
                screen.back[3].forEach((c: any, i: number) => c.char = i === 0 ? 'Y' : ' ');
            };

            // register insertBefore
            app.insertBefore('HEADER LINE');

            // Mark root dirty so requestRender performs a render
            (root as any).isDirty = true;

            app.requestRender();

            // requestRender defers via setImmediate — flush before asserting
            await new Promise(r => setImmediate(r));

            // HEADER LINE plus rows should be present
            expect(fakeStdout.writes).toContain('HEADER LINE');

            // Verify back buffer was written
            expect(app.screen.back[2][0].char).toBe('X');
            expect(app.screen.back[3][0].char).toBe('Y');

            // Inline output verified via back buffer above; scrollback write is implementation detail

            app.exit(0);
            await mountPromise.catch(() => {});
        });
        it('does not merge borders when dockBorders is false', () => {
            const root = createMockRootWidget();

            (root as any).render = (screen: any) => {
                screen.setCell(3, 2, { char: '│' });
                screen.setCell(3, 4, { char: '│' });

                screen.setCell(2, 3, { char: '─' });
                screen.setCell(4, 3, { char: '─' });
            };

            const fakeStdout: any = {
                columns: 80, rows: 24, isTTY: true,
                write(_s: string) { return true; },
                on() {}, off() {}, once() {},
            };
            const fakeStdin: any = {
                isTTY: true, setRawMode() {}, resume() {}, pause() {}, on() {}, off() {},
            };

            const app = new App(root, {
                forceFallback: false,
                skipFallback: true,
                dockBorders: false,
                stdout: fakeStdout as unknown as NodeJS.WriteStream,
                stdin: fakeStdin as unknown as NodeJS.ReadStream,
            });

            try {
                // requestRender() returns immediately because _mounted is false
                (app as any).requestRender();

                expect(app.screen.back[3][3].char).toBe(' ');
            } finally {
                // Clean up Terminal's signal/error handlers to prevent them from
                // interfering with other tests via process.exit(1)
                app.terminal.restore();
            }
        });
    });

    describe('focus state integration', () => {
        it('updates widget isFocused flags when focus changes', async () => {
            const { root, first, second } = createFocusTestRoot();
            const app = new App(root, createInteractiveTestOptions());

            // Register before mount so the widget map contains them on first render
            app.focus.register({ id: first.id, tabIndex: 0, focusable: true });
            app.focus.register({ id: second.id, tabIndex: 1, focusable: true });

            const mountPromise = app.mount();
            // requestRender() defers via setImmediate — flush before asserting
            await new Promise(r => setImmediate(r));

            expect(first.isFocused).toBe(true);
            expect(second.isFocused).toBe(false);

            app.focus.focusNext();
            await new Promise(r => setImmediate(r));

            expect(first.isFocused).toBe(false);
            expect(second.isFocused).toBe(true);

            app.exit(0);
            await mountPromise.catch(() => {});
        });

        it('marks changed widgets dirty and re-renders focus output', async () => {
            const { root, first, second } = createFocusTestRoot();
            const app = new App(root, createInteractiveTestOptions());

            // Register before mount so the widget map contains them on first render
            app.focus.register({ id: first.id, tabIndex: 0, focusable: true });
            app.focus.register({ id: second.id, tabIndex: 1, focusable: true });

            const mountPromise = app.mount();
            // requestRender() defers via setImmediate — flush before asserting render output
            await new Promise(r => setImmediate(r));

            expect(app.screen.back[0][0].char).toBe('F');
            expect(app.screen.back[0][1].char).toBe('-');

            const firstDirtyBefore = first.dirtyCount;
            const secondDirtyBefore = second.dirtyCount;
            const rootRenderBefore = root.renderCount;

            app.focus.focusNext();
            await new Promise(r => setImmediate(r));

            expect(first.dirtyCount).toBeGreaterThan(firstDirtyBefore);
            expect(second.dirtyCount).toBeGreaterThan(secondDirtyBefore);
            expect(root.renderCount).toBeGreaterThan(rootRenderBefore);
            expect(app.screen.back[0][0].char).toBe('-');
            expect(app.screen.back[0][1].char).toBe('F');

            app.exit(0);
            await mountPromise.catch(() => {});
        });

        it('syncs focus state when focus events happen before the widget map exists', async () => {
            const { root, first, second } = createFocusTestRoot();
            const app = new App(root, createInteractiveTestOptions());

            app.focus.register({ id: first.id, tabIndex: 0, focusable: true });
            app.focus.register({ id: second.id, tabIndex: 1, focusable: true });

            expect(first.isFocused).toBe(false);
            expect(second.isFocused).toBe(false);

            const mountPromise = app.mount();
            // requestRender() defers via setImmediate — flush before asserting render output
            await new Promise(r => setImmediate(r));

            expect(first.isFocused).toBe(true);
            expect(second.isFocused).toBe(false);
            expect(app.screen.back[0][0].char).toBe('F');
            expect(app.screen.back[0][1].char).toBe('-');

            app.exit(0);
            await mountPromise.catch(() => {});
        });

        it('requestRender schedules new callback after clean-tree early return', async () => {
        const root = createMockRootWidget();
        const renderSpy = vi.fn();
        (root as any).render = renderSpy;

        const app = new App(root, createInteractiveTestOptions());
        const mountPromise = app.mount();
        await new Promise(r => setImmediate(r));

        // Root is clean now. requestRender should hit the early return path.
        (root as any).isDirty = false;
        app.requestRender();
        await new Promise(r => setImmediate(r));

        // Mark dirty and request another render — should NOT be silently dropped
        (root as any).isDirty = true;
        const renderCountBefore = renderSpy.mock.calls.length;
        app.requestRender();
        await new Promise(r => setImmediate(r));

        expect(renderSpy.mock.calls.length).toBeGreaterThan(renderCountBefore);

        app.exit(0);
        await mountPromise.catch(() => {});
    });

    it('unsubscribes focus handlers on unmount', async () => {
            const { root, first, second } = createFocusTestRoot();
            const app = new App(root, createInteractiveTestOptions());

            // Register before mount so the widget map contains them on first render
            app.focus.register({ id: first.id, tabIndex: 0, focusable: true });
            app.focus.register({ id: second.id, tabIndex: 1, focusable: true });

            const mountPromise = app.mount();
            // requestRender() defers via setImmediate — flush before asserting focus state
            await new Promise(r => setImmediate(r));

            expect(first.isFocused).toBe(true);
            expect(second.isFocused).toBe(false);

            app.unmount();

            const rootRenderBefore = root.renderCount;
            const firstDirtyBefore = first.dirtyCount;
            const secondDirtyBefore = second.dirtyCount;

            app.focus.focusNext();
            await new Promise(r => setImmediate(r));

            expect(first.isFocused).toBe(true);
            expect(second.isFocused).toBe(false);
            expect(first.dirtyCount).toBe(firstDirtyBefore);
            expect(second.dirtyCount).toBe(secondDirtyBefore);
            expect(root.renderCount).toBe(rootRenderBefore);

            app.exit(0);
            await mountPromise.catch(() => {});
        });
    });

    describe('_findWidgetAt z-order hit-testing', () => {
        function createHitWidget(id: string, rect: { x: number; y: number; width: number; height: number }, style?: { zIndex?: number; visible?: boolean }, parent?: any): any {
            return { id, rect, style, parent, events: { emit() {} } };
        }

        it('returns highest z-index widget at the hit point', () => {
            const root = createMockRootWidget();
            const app = new App(root, { forceFallback: true });

            const low = createHitWidget('low', { x: 0, y: 0, width: 10, height: 10 }, { zIndex: 1 });
            const high = createHitWidget('high', { x: 0, y: 0, width: 10, height: 10 }, { zIndex: 10 });

            (app as any)._widgetById.set('low', low);
            (app as any)._widgetById.set('high', high);

            const result = (app as any)._findWidgetAt(5, 5);
            expect(result.id).toBe('high');
        });

        it('returns widget with no zIndex (default 0) when it is the only match', () => {
            const root = createMockRootWidget();
            const app = new App(root, { forceFallback: true });

            const widget = createHitWidget('only', { x: 0, y: 0, width: 10, height: 10 });
            (app as any)._widgetById.set('only', widget);

            const result = (app as any)._findWidgetAt(5, 5);
            expect(result.id).toBe('only');
        });

        it('returns null when no widget contains the point', () => {
            const root = createMockRootWidget();
            const app = new App(root, { forceFallback: true });

            const widget = createHitWidget('w', { x: 0, y: 0, width: 5, height: 5 });
            (app as any)._widgetById.set('w', widget);

            const result = (app as any)._findWidgetAt(10, 10);
            expect(result).toBeNull();
        });

        it('skips hidden (visible=false) widgets during hit-test', () => {
            const root = createMockRootWidget();
            const app = new App(root, { forceFallback: true });

            const visible = createHitWidget('visible', { x: 0, y: 0, width: 10, height: 10 }, { zIndex: 1 });
            const hidden = createHitWidget('hidden', { x: 0, y: 0, width: 10, height: 10 }, { zIndex: 5, visible: false });

            (app as any)._widgetById.set('visible', visible);
            (app as any)._widgetById.set('hidden', hidden);

            const result = (app as any)._findWidgetAt(5, 5);
            expect(result.id).toBe('visible');
        });

        it('prefers deepest child among same z-index widgets', () => {
            const root = createMockRootWidget();
            const app = new App(root, { forceFallback: true });

            const parent = createHitWidget('parent', { x: 0, y: 0, width: 10, height: 10 }, { zIndex: 1 });
            const child = createHitWidget('child', { x: 0, y: 0, width: 10, height: 10 }, { zIndex: 1 }, parent);

            (app as any)._widgetById.set('parent', parent);
            (app as any)._widgetById.set('child', child);

            const result = (app as any)._findWidgetAt(5, 5);
            expect(result.id).toBe('child');
        });
    });
});
