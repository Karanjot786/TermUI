// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for LayoutDebug widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import type { KeyEvent } from '@termuijs/core';
import { LayoutDebug, type LayoutDebugInfo } from './LayoutDebug.js';

function makeKeyEvent(key: string): KeyEvent {
    return { key, ctrl: false, alt: false, shift: false, stopPropagation: () => {} } as KeyEvent;
}

function makeDebug(width = 60, height = 20) {
    const debug = new LayoutDebug({ visible: true });
    debug.updateRect({ x: 0, y: 0, width, height });
    return debug;
}

function renderDebug(debug: LayoutDebug, width = 60, height = 20): Screen {
    const screen = new Screen(width, height);
    debug.updateRect({ x: 0, y: 0, width, height });
    debug.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

describe('LayoutDebug', () => {
    const widgets: LayoutDebugInfo[] = [
        { id: 'w1', x: 2, y: 2, width: 20, height: 10, label: 'Header', padding: { top: 1, right: 1, bottom: 1, left: 1 }, margin: { top: 2, right: 2, bottom: 2, left: 2 } },
        { id: 'w2', x: 30, y: 5, width: 15, height: 8, label: 'Sidebar' },
    ];

    describe('1. Initial render', () => {
        it('renders nothing when not visible', () => {
            const debug = new LayoutDebug({ visible: false });
            const screen = renderDebug(debug);
            const text = rowText(screen, 0);
            expect(text).toBe('');
        });

        it('renders widget bounds when visible', () => {
            const debug = makeDebug();
            debug.setWidgets(widgets);
            const screen = renderDebug(debug);
            const text = rowText(screen, 2);
            expect(text).toContain('┌');
        });

        it('renders widget labels', () => {
            const debug = makeDebug();
            debug.setWidgets(widgets);
            const screen = renderDebug(debug);
            const text = rowText(screen, 3);
            expect(text).toContain('Header');
        });
    });

    describe('2. Toggle visibility', () => {
        it('toggle() shows overlay', () => {
            const debug = new LayoutDebug({ visible: false });
            debug.toggle();
            expect(debug.isVisible).toBe(true);
        });

        it('toggle() hides overlay', () => {
            const debug = makeDebug();
            debug.toggle();
            expect(debug.isVisible).toBe(false);
        });

        it('show() makes overlay visible', () => {
            const debug = new LayoutDebug({ visible: false });
            debug.show();
            expect(debug.isVisible).toBe(true);
        });

        it('hide() makes overlay hidden', () => {
            const debug = makeDebug();
            debug.hide();
            expect(debug.isVisible).toBe(false);
        });
    });

    describe('3. Keyboard shortcuts', () => {
        it('toggle key toggles visibility', () => {
            const debug = makeDebug();
            debug.handleKey(makeKeyEvent('d'));
            expect(debug.isVisible).toBe(false);
        });

        it('g key toggles grid', () => {
            const debug = makeDebug();
            debug.handleKey(makeKeyEvent('g'));
            expect(debug['_opts'].showGrid).toBe(true);
        });

        it('p key toggles padding', () => {
            const debug = makeDebug();
            debug.handleKey(makeKeyEvent('p'));
            expect(debug['_opts'].showPadding).toBe(false);
        });

        it('m key toggles margins', () => {
            const debug = makeDebug();
            debug.handleKey(makeKeyEvent('m'));
            expect(debug['_opts'].showMargin).toBe(false);
        });

        it('b key toggles bounds', () => {
            const debug = makeDebug();
            debug.handleKey(makeKeyEvent('b'));
            expect(debug['_opts'].showBounds).toBe(false);
        });

        it('l key toggles labels', () => {
            const debug = makeDebug();
            debug.handleKey(makeKeyEvent('l'));
            expect(debug['_opts'].showLabels).toBe(false);
        });
    });

    describe('4. Options', () => {
        it('setOption updates option', () => {
            const debug = makeDebug();
            debug.setOption('showGrid', true);
            expect(debug['_opts'].showGrid).toBe(true);
        });

        it('custom toggleKey works', () => {
            const debug = new LayoutDebug({ visible: true, toggleKey: 'x' });
            debug.handleKey(makeKeyEvent('x'));
            expect(debug.isVisible).toBe(false);
        });

        it('other keys do not toggle', () => {
            const debug = makeDebug();
            debug.handleKey(makeKeyEvent('a'));
            expect(debug.isVisible).toBe(true);
        });
    });

    describe('5. Widget rendering', () => {
        it('renders padding when enabled', () => {
            const debug = makeDebug();
            debug.setWidgets(widgets);
            const screen = renderDebug(debug);
            const text = rowText(screen, 3);
            expect(text).toContain('│');
        });

        it('renders margin when enabled', () => {
            const debug = makeDebug();
            debug.setWidgets(widgets);
            const screen = renderDebug(debug);
            const text = rowText(screen, 0);
            expect(text).toContain('┌');
        });

        it('does not render padding when disabled', () => {
            const debug = makeDebug();
            debug.setOption('showPadding', false);
            debug.setWidgets(widgets);
            const screen = renderDebug(debug);
            const text = rowText(screen, 4);
            expect(text).not.toContain('│  │');
        });

        it('does not render margin when disabled', () => {
            const debug = makeDebug();
            debug.setOption('showMargin', false);
            debug.setWidgets(widgets);
            const screen = renderDebug(debug);
            const text = rowText(screen, 0);
            expect(text).not.toContain('┌');
        });
    });

    describe('6. Debug panel', () => {
        it('renders debug panel at bottom', () => {
            const debug = makeDebug();
            debug.setWidgets(widgets);
            const screen = renderDebug(debug);
            const bottomText = rowText(screen, 19);
            expect(bottomText).toContain('LayoutDebug');
        });
    });

    describe('7. Edge cases', () => {
        it('handles empty widgets list', () => {
            const debug = makeDebug();
            expect(() => {
                debug.setWidgets([]);
                const screen = renderDebug(debug);
                rowText(screen, 0);
            }).not.toThrow();
        });

        it('handles zero-size rect', () => {
            const debug = new LayoutDebug({ visible: true });
            expect(() => {
                debug.updateRect({ x: 0, y: 0, width: 0, height: 0 });
                const screen = new Screen(0, 0);
                debug.render(screen);
            }).not.toThrow();
        });
    });

    describe('8. Unicode / ASCII fallback', () => {
        it('uses unicode chars when caps.unicode is true', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const debug = makeDebug();
            debug.setWidgets(widgets);
            const screen = renderDebug(debug);
            const text = rowText(screen, 2);
            expect(text).toContain('┌');
            vi.restoreAllMocks();
        });

        it('uses ASCII chars when caps.unicode is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const debug = makeDebug();
            debug.setWidgets(widgets);
            const screen = renderDebug(debug);
            const text = rowText(screen, 2);
            expect(text).toContain('+');
            vi.restoreAllMocks();
        });
    });
});
