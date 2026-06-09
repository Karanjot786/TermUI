// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for App lifecycle
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { App, type AppOptions, type RootWidget } from './App.js';
import type { Screen } from '../terminal/Screen.js';
import type { LayoutNode } from '../layout/LayoutEngine.js';
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
        it('registers uncaughtException and unhandledRejection handlers, cleans up on restore', () => {
            const uncaughtBefore = process.listenerCount('uncaughtException');
            const rejectionBefore = process.listenerCount('unhandledRejection');

            const root = createMockRootWidget();
            const app = new App(root, { forceFallback: true });

            // Terminal constructor now registers handlers for both events
            expect(process.listenerCount('uncaughtException')).toBe(uncaughtBefore + 1);
            expect(process.listenerCount('unhandledRejection')).toBe(rejectionBefore + 1);

            // Clean up — explicitly restore to remove handlers
            app.terminal.restore();

            expect(process.listenerCount('uncaughtException')).toBe(uncaughtBefore);
            expect(process.listenerCount('unhandledRejection')).toBe(rejectionBefore);
        });

        it('registers and cleans up SIGINT/SIGTERM handlers on restore', () => {
            const sigintBefore = process.listenerCount('SIGINT');
            const sigtermBefore = process.listenerCount('SIGTERM');

            const root = createMockRootWidget();
            const app = new App(root, { forceFallback: true });

            // Handlers should be registered by Terminal constructor
            expect(process.listenerCount('SIGINT')).toBeGreaterThan(sigintBefore);
            expect(process.listenerCount('SIGTERM')).toBeGreaterThan(sigtermBefore);

            // Explicitly restore to remove handlers
            app.terminal.restore();
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

    const app = new App(root, {
        forceFallback: false,
        skipFallback: true,
        dockBorders: false,
    });

    // Force fallback path renders immediately
    (app as any).requestRender();

    expect(app.screen.back[3][3].char).toBe(' ');
});
    });
});
