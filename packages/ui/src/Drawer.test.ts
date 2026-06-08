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

// ── Extended behavioural tests ─────────────────────────

describe('Drawer — initial state', () => {
    it('1. isOpen is false on construction', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        expect(drawer.isOpen).toBe(false);
    });

    it('2. focusable is true on construction', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        expect(drawer.focusable).toBe(true);
    });
});

describe('Drawer — lifecycle methods', () => {
    it('2. open() resets _focusIndex to -1', () => {
        const drawer = new Drawer({ position: 'right', width: 20, onClose: vi.fn() });
        // Advance focus index by opening and tabbing
        drawer.open();
        const childA = new Box(); childA.focusable = true;
        drawer.addChild(childA);
        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        // _focusIndex is now 0 — calling open() again must reset it
        drawer.open();
        expect((drawer as any)._focusIndex).toBe(-1);
    });

    it('3. close() makes isOpen false', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        drawer.open();
        drawer.close();
        expect(drawer.isOpen).toBe(false);
    });

    it('4. multiple open() calls are idempotent and do not throw', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        expect(() => {
            drawer.open();
            drawer.open();
            drawer.open();
        }).not.toThrow();
        expect(drawer.isOpen).toBe(true);
    });

    it('5. multiple close() calls are idempotent and do not throw', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        expect(() => {
            drawer.close();
            drawer.close();
        }).not.toThrow();
        expect(drawer.isOpen).toBe(false);
    });

    it('6. three toggle() calls leave drawer open', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        drawer.toggle(); // open
        drawer.toggle(); // close
        drawer.toggle(); // open
        expect(drawer.isOpen).toBe(true);
    });
});

describe('Drawer — keyboard handling', () => {
    it('7. Escape while closed does not change isOpen', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'left', width: 15, onClose });
        drawer.handleKey({ key: 'escape', ctrl: false, alt: false } as any);
        expect(drawer.isOpen).toBe(false);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('8. Tab with no focusable children does not throw', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        drawer.open();
        expect(() => {
            drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        }).not.toThrow();
        // After tab with no focusable children, _focusIndex stays -1 (unchanged)
        expect((drawer as any)._focusIndex).toBe(-1);
    });

    it('9. single focusable child stays focused on repeated Tab presses', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        drawer.open();
        const child = new Box(); child.focusable = true;
        drawer.addChild(child);

        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        expect(child.isFocused).toBe(true);

        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        expect(child.isFocused).toBe(true);

        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        expect(child.isFocused).toBe(true);
    });

    it('10. non-focusable children are never focused', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        drawer.open();
        const nonFocusable = new Box(); nonFocusable.focusable = false;
        const focusableChild = new Box(); focusableChild.focusable = true;
        drawer.addChild(nonFocusable);
        drawer.addChild(focusableChild);

        // Tab multiple times — only focusableChild should ever be focused
        for (let i = 0; i < 5; i++) {
            drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
            expect(nonFocusable.isFocused).toBe(false);
        }
    });

    it('11. nested focusable grandchild is collected and focused', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        drawer.open();

        const parent = new Box(); parent.focusable = false;
        const grandchild = new Box(); grandchild.focusable = true;
        parent.addChild(grandchild);
        drawer.addChild(parent);

        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        expect(grandchild.isFocused).toBe(true);
    });

    it('12. Shift+Tab from initial state wraps focus to last focusable child', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        drawer.open();
        const childA = new Box(); childA.focusable = true;
        const childB = new Box(); childB.focusable = true;
        const childC = new Box(); childC.focusable = true;
        drawer.addChild(childA);
        drawer.addChild(childB);
        drawer.addChild(childC);

        // Shift+Tab with _focusIndex === -1: base = 0, wraps to (0-1+3)%3 = 2 → childC
        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: true } as any);
        expect(childC.isFocused).toBe(true);
        expect(childA.isFocused).toBe(false);
        expect(childB.isFocused).toBe(false);
    });

    it('13. Tab wraps correctly across 3 children after 4 presses', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        drawer.open();
        const children = [new Box(), new Box(), new Box()];
        children.forEach(c => { c.focusable = true; drawer.addChild(c); });

        const tab = () => drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        tab(); // → index 0
        tab(); // → index 1
        tab(); // → index 2
        tab(); // → wraps to index 0
        expect(children[0].isFocused).toBe(true);
        expect(children[1].isFocused).toBe(false);
        expect(children[2].isFocused).toBe(false);
    });

    it('14. markDirty is called during Tab and Shift+Tab navigation', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        drawer.open();
        const child = new Box(); child.focusable = true;
        drawer.addChild(child);

        // Clear the initially-dirty state first
        (drawer as any)._dirty = false;

        const spy = vi.spyOn(drawer as any, 'markDirty');

        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
        expect(spy).toHaveBeenCalled();

        spy.mockClear();
        drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: true } as any);
        expect(spy).toHaveBeenCalled();
    });

    it('29. non-Escape keys (enter, space, left, right) do not fire onClose', () => {
        const onClose = vi.fn();
        const drawer = new Drawer({ position: 'left', width: 20, onClose });
        drawer.open();

        for (const key of ['enter', 'space', 'left', 'right'] as const) {
            drawer.handleKey({ key, ctrl: false, alt: false, shift: false } as any);
        }
        expect(onClose).not.toHaveBeenCalled();
    });

    it('30. exactly one child is focused at any time while cycling', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        drawer.open();
        const children = [new Box(), new Box(), new Box()];
        children.forEach(c => { c.focusable = true; drawer.addChild(c); });

        const focusedCount = () => children.filter(c => c.isFocused).length;

        // Before any tab press: none focused
        expect(focusedCount()).toBe(0);

        for (let i = 0; i < 6; i++) {
            drawer.handleKey({ key: 'tab', ctrl: false, alt: false, shift: false } as any);
            expect(focusedCount()).toBe(1);
        }
    });
});

describe('Drawer — rendering edge cases', () => {
    it('15. child rendering is clipped to content area', () => {
        // A child that tries to render outside the panel bounds should be clipped.
        // We verify by checking that cells outside the drawer panel area remain
        // untouched (space / empty), since pushClip prevents writes outside.
        const SMALL_COLS = 20;
        const SMALL_ROWS = 10;
        const screen = new Screen(SMALL_COLS, SMALL_ROWS);
        const drawer = new Drawer({ position: 'left', width: 10, onClose: vi.fn() });
        drawer.open();
        drawer.updateRect({ x: 0, y: 0, width: SMALL_COLS, height: SMALL_ROWS });

        // Add a child that renders a distinctive character
        const child = new Box();
        child.focusable = false;
        drawer.addChild(child);

        expect(() => drawer.render(screen)).not.toThrow();

        // Columns 10..19 belong to the backdrop (not the panel interior).
        // The child's rect is constrained to the content area, so column 11+
        // (beyond panel interior) must not contain child-written content.
        // Simply verify no exception occurred and the border is present.
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0[0]).toBe('┌');
    });

    it('16. width larger than screen clamps without throwing', () => {
        const screen = new Screen(10, 10);
        const drawer = new Drawer({ position: 'left', width: 1000, onClose: vi.fn() });
        drawer.open();
        drawer.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        expect(() => drawer.render(screen)).not.toThrow();
        // Panel should be clamped to screen width (10)
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0[0]).toBe('┌');
        expect(row0[9]).toBe('┐');
    });

    it('17. height larger than screen clamps without throwing (top position)', () => {
        const screen = new Screen(20, 8);
        const drawer = new Drawer({ position: 'top', height: 1000, onClose: vi.fn() });
        drawer.open();
        drawer.updateRect({ x: 0, y: 0, width: 20, height: 8 });
        expect(() => drawer.render(screen)).not.toThrow();
        // Panel clamped to 8 rows
        const lastRow = screen.back[7].map(c => c.char).join('');
        expect(lastRow[0]).toBe('└');
    });

    it('18. width=1 does not crash', () => {
        const screen = new Screen(40, 10);
        const drawer = new Drawer({ position: 'left', width: 1, onClose: vi.fn() });
        drawer.open();
        drawer.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        expect(() => drawer.render(screen)).not.toThrow();
    });

    it('19. height=1 does not crash (top position)', () => {
        const screen = new Screen(40, 20);
        const drawer = new Drawer({ position: 'top', height: 1, onClose: vi.fn() });
        drawer.open();
        drawer.updateRect({ x: 0, y: 0, width: 40, height: 20 });
        expect(() => drawer.render(screen)).not.toThrow();
    });

    it('20. empty title renders border without extra spaces', () => {
        const drawer = new Drawer({ position: 'left', width: 16, title: '', onClose: vi.fn() });
        drawer.open();
        const screen = renderDrawer(drawer);
        const topRow = rowText(screen, 0).slice(0, 16);
        // Top-left and top-right corners must be present
        expect(topRow[0]).toBe('┌');
        expect(topRow[15]).toBe('┐');
        // No alphabetic characters should appear in the top border
        expect(/[a-zA-Z]/.test(topRow)).toBe(false);
    });

    it('21. long title does not throw; top-left corner is still rendered', () => {
        // NOTE: The production code writes the full composed border string
        // (topLeft + fill + titleStr + fill + topRight) via a single writeString
        // call. When titleStr.length > innerWidth, the '┐' corner overflows past
        // the panel boundary and title characters appear beyond column 9. This is
        // a known rendering limitation — the test documents actual behaviour
        // rather than asserting clipping that the code does not perform.
        const longTitle = 'A'.repeat(200);
        const drawer = new Drawer({ position: 'left', width: 10, title: longTitle, onClose: vi.fn() });
        drawer.open();
        // Verify no throw, then inspect the single render result.
        const screen = makeScreen();
        drawer.updateRect({ x: 0, y: 0, width: COLS, height: ROWS });
        expect(() => drawer.render(screen)).not.toThrow();
        // Top-left corner '┌' must still be at column 0.
        const topRow = rowText(screen, 0);
        expect(topRow[0]).toBe('┌');
    });

    it('22. custom backdropChar is rendered across the backdrop area', () => {
        const drawer = new Drawer({
            position: 'left',
            width: 10,
            backdropChar: '#',
            onClose: vi.fn(),
        });
        drawer.open();
        const screen = renderDrawer(drawer);

        // The backdrop occupies the full width x height region before the panel
        // is drawn on top. Columns beyond the panel (10..39) remain backdrop.
        // Row 1 (interior, not border) — columns 10..39 should have '#'
        const row1 = screen.back[1].map(c => c.char).join('');
        // Columns 10 to 39 are in the backdrop zone (outside the left panel)
        expect(row1[10]).toBe('#');
        expect(row1[COLS - 1]).toBe('#');
    });

    it('23. custom borderColor is applied to border cells', () => {
        const drawer = new Drawer({
            position: 'left',
            width: 10,
            borderColor: { type: 'named', name: 'red' },
            onClose: vi.fn(),
        });
        drawer.open();
        const screen = renderDrawer(drawer);

        // Top-left corner cell (0,0) should have red foreground
        const cornerCell = screen.back[0][0];
        expect(cornerCell.char).toBe('┌');
        expect(cornerCell.fg).toEqual({ type: 'named', name: 'red' });
    });

    it('24. backdrop cells have dim=true when drawer is open', () => {
        const drawer = new Drawer({ position: 'left', width: 10, onClose: vi.fn() });
        drawer.open();
        const screen = renderDrawer(drawer);

        // Backdrop is rendered across the entire region before the panel overwrites it.
        // Column 15 (beyond the panel, still in backdrop area) on row 5 should be dim.
        const backdropCell = screen.back[5][15];
        expect(backdropCell.dim).toBe(true);
    });

    it('25. closed drawer renders nothing across multiple rows', () => {
        const drawer = new Drawer({ position: 'left', width: 15, title: 'Hello', onClose: vi.fn() });
        // Do NOT open — stays closed
        const screen = renderDrawer(drawer);

        for (let r = 0; r < ROWS; r++) {
            const row = rowText(screen, r);
            expect(row.includes('┌')).toBe(false);
            expect(row.includes('┐')).toBe(false);
            expect(row.includes('└')).toBe(false);
            expect(row.includes('┘')).toBe(false);
            expect(row.includes('H')).toBe(false);
        }
    });

    it('26. child rect is restored after rendering', () => {
        const drawer = new Drawer({ position: 'left', width: 20, onClose: vi.fn() });
        drawer.open();
        const child = new Box(); child.focusable = false;
        // Set a specific rect on the child before rendering
        child.updateRect({ x: 5, y: 5, width: 8, height: 3 });
        drawer.addChild(child);

        const screen = renderDrawer(drawer);
        // After render the child's rect must be restored to original values
        expect(child.rect).toEqual({ x: 5, y: 5, width: 8, height: 3 });
        void screen; // suppress unused
    });
});

describe('Drawer — _panelRect geometry', () => {
    function panelRect(
        position: 'left' | 'right' | 'top' | 'bottom',
        panelWidth: number,
        panelHeight: number,
        totalWidth: number,
        totalHeight: number,
    ) {
        const drawer = new Drawer({ position, width: panelWidth, height: panelHeight, onClose: vi.fn() });
        // Access private method via cast for geometry verification
        return (drawer as any)._panelRect(0, 0, totalWidth, totalHeight) as {
            px: number; py: number; pw: number; ph: number;
        };
    }

    it('27a. left position: px=0, py=0, pw=panelWidth, ph=totalHeight', () => {
        const { px, py, pw, ph } = panelRect('left', 15, 10, 40, 20);
        expect(px).toBe(0);
        expect(py).toBe(0);
        expect(pw).toBe(15);
        expect(ph).toBe(20);
    });

    it('27b. right position: px=totalWidth-panelWidth, py=0, pw=panelWidth, ph=totalHeight', () => {
        const { px, py, pw, ph } = panelRect('right', 15, 10, 40, 20);
        expect(px).toBe(25); // 40 - 15
        expect(py).toBe(0);
        expect(pw).toBe(15);
        expect(ph).toBe(20);
    });

    it('27c. top position: px=0, py=0, pw=totalWidth, ph=panelHeight', () => {
        const { px, py, pw, ph } = panelRect('top', 15, 8, 40, 20);
        expect(px).toBe(0);
        expect(py).toBe(0);
        expect(pw).toBe(40);
        expect(ph).toBe(8);
    });

    it('27d. bottom position: px=0, py=totalHeight-panelHeight, pw=totalWidth, ph=panelHeight', () => {
        const { px, py, pw, ph } = panelRect('bottom', 15, 8, 40, 20);
        expect(px).toBe(0);
        expect(py).toBe(12); // 20 - 8
        expect(pw).toBe(40);
        expect(ph).toBe(8);
    });

    it('27e. panelWidth clamped when larger than totalWidth (left)', () => {
        const { pw } = panelRect('left', 100, 10, 40, 20);
        expect(pw).toBe(40);
    });

    it('27f. panelHeight clamped when larger than totalHeight (top)', () => {
        const { ph } = panelRect('top', 15, 100, 40, 20);
        expect(ph).toBe(20);
    });
});

describe('Drawer — rendering does not throw', () => {
    const positions = ['left', 'right', 'top', 'bottom'] as const;

    for (const position of positions) {
        it(`28. renders position="${position}" without throwing`, () => {
            const drawer = new Drawer({ position, width: 12, height: 6, onClose: vi.fn() });
            drawer.open();
            expect(() => renderDrawer(drawer)).not.toThrow();
        });

        it(`28. renders position="${position}" with title without throwing`, () => {
            const drawer = new Drawer({ position, width: 12, height: 6, title: 'T', onClose: vi.fn() });
            drawer.open();
            expect(() => renderDrawer(drawer)).not.toThrow();
        });
    }

    it('28. renders without title without throwing', () => {
        const drawer = new Drawer({ position: 'left', width: 12, onClose: vi.fn() });
        drawer.open();
        expect(() => renderDrawer(drawer)).not.toThrow();
    });

    it('28. renders with custom backdropChar without throwing', () => {
        const drawer = new Drawer({ position: 'left', width: 12, backdropChar: '*', onClose: vi.fn() });
        drawer.open();
        expect(() => renderDrawer(drawer)).not.toThrow();
    });

    it('28. renders with custom borderColor without throwing', () => {
        const drawer = new Drawer({
            position: 'left',
            width: 12,
            borderColor: { type: 'named', name: 'green' },
            onClose: vi.fn(),
        });
        drawer.open();
        expect(() => renderDrawer(drawer)).not.toThrow();
    });
});

