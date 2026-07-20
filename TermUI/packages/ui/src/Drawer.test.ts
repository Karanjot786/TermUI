// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Drawer widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { Box } from '@termuijs/widgets';
import { Drawer } from './Drawer.js';

// ── Helpers ───────────────────────────────────────────

const COLS = 40;
const ROWS = 20;

function makeScreen(): Screen {
    return new Screen(COLS, ROWS);
}

function renderDrawer(drawer: Drawer): Screen {
    const screen = makeScreen();
    drawer.updateRect({ x: 0, y: 0, width: COLS, height: ROWS });
    drawer.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    return screen.back[row].map((c) => c.char).join('');
}

// ── Tests ─────────────────────────────────────────────

describe('Drawer', () => {
    // ── 1. Renders at the correct edge ────────────────

    it('renders at the right edge when position is "right"', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'right', width: 10, title: 'Menu', onClose });
        drawer.open();
        const screen = renderDrawer(drawer);

        // The border top-right corner should be at the last column (COLS-1)
        // and top-left corner of panel at COLS-10 = column 30
        const topRow = rowText(screen, 0);
        // Column 30 should be the top-left corner character of the border
        expect(topRow[COLS - 10]).toBe('┌');
        // Column 39 should be the top-right corner
        expect(topRow[COLS - 1]).toBe('┐');
    });

    it('renders at the left edge when position is "left"', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'left', width: 12, onClose });
        drawer.open();
        const screen = renderDrawer(drawer);

        const topRow = rowText(screen, 0);
        // Top-left corner at column 0
        expect(topRow[0]).toBe('┌');
        // Top-right corner at column 11 (width-1)
        expect(topRow[11]).toBe('┐');
    });

    it('renders at the top edge when position is "top"', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'top', height: 5, onClose });
        drawer.open();
        const screen = renderDrawer(drawer);

        // Top row should start with ┌
        const topRow = rowText(screen, 0);
        expect(topRow[0]).toBe('┌');

        // Row 4 (height-1) should be the bottom border
        const bottomRow = rowText(screen, 4);
        expect(bottomRow[0]).toBe('└');
    });

    it('renders at the bottom edge when position is "bottom"', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'bottom', height: 6, onClose });
        drawer.open();
        const screen = renderDrawer(drawer);

        // Top border of drawer should be at row ROWS - height = 20 - 6 = 14
        const panelTopRow = rowText(screen, ROWS - 6);
        expect(panelTopRow[0]).toBe('┌');

        // Bottom border at row ROWS - 1 = 19
        const panelBottomRow = rowText(screen, ROWS - 1);
        expect(panelBottomRow[0]).toBe('└');
    });

    // ── 2. Escape fires onClose ───────────────────────

    it('fires onClose when Escape is pressed while open', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'left', width: 15, onClose });
        drawer.open();

        drawer.handleKey({ key: 'escape', ctrl: false, alt: false } as any);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not fire onClose when Escape is pressed while closed', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'left', width: 15, onClose });
        // Drawer starts closed — do not call open()

        drawer.handleKey({ key: 'escape', ctrl: false, alt: false } as any);
        expect(onClose).not.toHaveBeenCalled();
    });

    // ── 3. Focus is trapped inside the drawer ─────────

    it('cycles focus through children on Tab (focus trap)', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'right', width: 20, onClose });
        drawer.open();

        // Add two focusable children
        const childA = new Box();
        childA.focusable = true;
        const childB = new Box();
        childB.focusable = true;
        drawer.addChild(childA);
        drawer.addChild(childB);

        // First Tab: focus moves to index 0 → childA gets focus
        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        expect(childA.isFocused).toBe(true);
        expect(childB.isFocused).toBe(false);

        // Second Tab: focus moves to index 1 → childB gets focus
        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        expect(childA.isFocused).toBe(false);
        expect(childB.isFocused).toBe(true);

        // Third Tab: wraps back to index 0 → childA gets focus
        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        expect(childA.isFocused).toBe(true);
        expect(childB.isFocused).toBe(false);
    });

    it('cycles focus backwards on Shift+Tab', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'left', width: 20, onClose });
        drawer.open();

        const childA = new Box();
        childA.focusable = true;
        const childB = new Box();
        childB.focusable = true;
        drawer.addChild(childA);
        drawer.addChild(childB);

        // Move to childB (index 1) first
        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        expect(childB.isFocused).toBe(true);

        // Shift+Tab: wraps back to childA (index 0)
        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: true } as any);
        expect(childA.isFocused).toBe(true);
        expect(childB.isFocused).toBe(false);
    });

    // ── 4. Title renders ──────────────────────────────

    it('renders the title in the top border', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'left', width: 20, title: 'Settings', onClose });
        drawer.open();
        const screen = renderDrawer(drawer);

        const topRow = rowText(screen, 0);
        expect(topRow).toContain('Settings');
    });

    it('renders without a title when none is provided', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'left', width: 20, onClose });
        drawer.open();
        const screen = renderDrawer(drawer);

        // Top row should have border characters but no text beyond the border
        const topRow = rowText(screen, 0).slice(0, 20);
        // Should start with top-left corner
        expect(topRow[0]).toBe('┌');
        // Should end with top-right corner at width-1
        expect(topRow[19]).toBe('┐');
        // No alphabetic characters expected in the top border row
        expect(/[a-zA-Z]/.test(topRow)).toBe(false);
    });

    // ── 5. open() / close() / toggle() call markDirty ─

    it('calls markDirty when opened', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'right', width: 20, onClose });
        const spy = vi.spyOn(drawer as any, 'markDirty');

        drawer.open();
        expect(spy).toHaveBeenCalled();
    });

    it('calls markDirty when closed', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'right', width: 20, onClose });
        drawer.open();
        const spy = vi.spyOn(drawer as any, 'markDirty');

        drawer.close();
        expect(spy).toHaveBeenCalled();
    });

    // ── 6. Visibility ─────────────────────────────────

    it('does not render anything when closed', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'left', width: 15, title: 'Hidden', onClose });
        // Do not call open()
        const screen = renderDrawer(drawer);

        // No border characters anywhere — screen should be blank
        const topRow = rowText(screen, 0);
        expect(topRow.includes('┌')).toBe(false);
        expect(topRow.includes('Settings')).toBe(false);
    });

    it('toggle() opens a closed drawer', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'bottom', height: 8, onClose });
        expect(drawer.isOpen).toBe(false);
        drawer.toggle();
        expect(drawer.isOpen).toBe(true);
    });

    it('toggle() closes an open drawer', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'bottom', height: 8, onClose });
        drawer.open();
        drawer.toggle();
        expect(drawer.isOpen).toBe(false);
    });
});
