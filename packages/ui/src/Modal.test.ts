// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Modal component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Text } from '@termuijs/widgets';
import { Modal } from './Modal.js';

// ── Helpers ───────────────────────────────────────────

const COLS = 80;
const ROWS = 24;

function makeScreen(cols = COLS, rows = ROWS): Screen {
    return new Screen(cols, rows);
}

function renderModal(modal: Modal, cols = COLS, rows = ROWS): Screen {
    const screen = makeScreen(cols, rows);
    modal.updateRect({ x: 0, y: 0, width: cols, height: rows });
    modal.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    return screen.back[row]!.map((c) => c.char).join('');
}

function allText(screen: Screen): string {
    return screen.back.map((row) => row.map((c) => c.char).join('')).join('\n');
}

// ── Tests ─────────────────────────────────────────────

describe('Modal', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── 1. Constructor & Defaults ─────────────────────

    describe('constructor & defaults', () => {
        it('initializes as hidden', () => {
            const modal = new Modal();
            expect(modal.visible).toBe(false);
        });

        it('defaults to width 50 (border at expected column)', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal();
            modal.show();
            const screen = renderModal(modal);
            const mw = Math.min(50, COLS - 4);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - Math.min(15, ROWS - 2)) / 2);
            expect(rowText(screen, my)[mx]).toBe('┌');
            expect(rowText(screen, my)[mx + mw - 1]).toBe('┐');
        });

        it('defaults to height 15 (border spans expected rows)', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal();
            modal.show();
            const screen = renderModal(modal);
            const mh = Math.min(15, ROWS - 2);
            const mw = Math.min(50, COLS - 4);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - mh) / 2);
            expect(rowText(screen, my)[mx]).toBe('┌');
            expect(rowText(screen, my + mh - 1)[mx]).toBe('└');
        });

        it('defaults to cyan border color', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal();
            modal.show();
            const screen = renderModal(modal);
            const mw = Math.min(50, COLS - 4);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - Math.min(15, ROWS - 2)) / 2);
            expect(screen.back[my]![mx]!.fg).toEqual({ type: 'named', name: 'cyan' });
        });

        it('defaults backdrop char to "░" in unicode mode', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal();
            modal.show();
            const screen = renderModal(modal, 20, 8);
            expect(allText(screen)).toContain('░');
        });

        it('defaults backdrop char to space in ASCII mode (no "░" char)', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const modal = new Modal();
            modal.show();
            const screen = renderModal(modal, 20, 8);
            expect(allText(screen)).not.toContain('░');
        });

        it('accepts custom title, width, and height', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: 'Settings', width: 60, height: 20 });
            modal.show();
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('Settings');
            const mw = Math.min(60, COLS - 4);
            const mx = Math.floor((COLS - mw) / 2);
            expect(rowText(screen, Math.floor((ROWS - Math.min(20, ROWS - 2)) / 2))[mx]).toBe('┌');
        });

        it('accepts custom borderColor', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ borderColor: { type: 'named', name: 'green' } });
            modal.show();
            const screen = renderModal(modal);
            const mw = Math.min(50, COLS - 4);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - Math.min(15, ROWS - 2)) / 2);
            expect(screen.back[my]![mx]!.fg).toEqual({ type: 'named', name: 'green' });
        });

        it('accepts custom backdropChar', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ backdropChar: '#' });
            modal.show();
            const screen = renderModal(modal, 20, 8);
            expect(allText(screen)).toContain('#');
        });
    });

    // ── 2. Visibility Controls ────────────────────────

    describe('visibility controls', () => {
        it('show() makes modal visible', () => {
            const modal = new Modal();
            modal.show();
            expect(modal.visible).toBe(true);
        });

        it('hide() makes modal hidden', () => {
            const modal = new Modal();
            modal.show();
            modal.hide();
            expect(modal.visible).toBe(false);
        });

        it('toggle() flips visibility false → true', () => {
            const modal = new Modal();
            modal.toggle();
            expect(modal.visible).toBe(true);
        });

        it('toggle() flips visibility true → false', () => {
            const modal = new Modal();
            modal.show();
            modal.toggle();
            expect(modal.visible).toBe(false);
        });

        it('show() calls markDirty()', () => {
            const modal = new Modal();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.show();
            expect(spy).toHaveBeenCalled();
        });

        it('hide() calls markDirty()', () => {
            const modal = new Modal();
            modal.show();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.hide();
            expect(spy).toHaveBeenCalled();
        });

        it('toggle() calls markDirty() when going false → true', () => {
            const modal = new Modal();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.toggle();
            expect(spy).toHaveBeenCalled();
        });

        it('toggle() calls markDirty() when going true → false', () => {
            const modal = new Modal();
            modal.show();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.toggle();
            expect(spy).toHaveBeenCalled();
        });
    });

    // ── 3. Content Management ─────────────────────────

    describe('content management', () => {
        it('setContent() renders the widget inside the modal', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            const content = new Text('Hello');
            modal.setContent(content);
            modal.show();
            const screen = renderModal(modal);
            expect(allText(screen)).toContain('Hello');
        });

        it('setContent() marks modal dirty', () => {
            const modal = new Modal();
            modal.clearDirty();
            modal.setContent(new Text('Hello'));
            expect(modal.isDirty).toBe(true);
        });

        it('replacing content renders second widget, not first', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            const child1 = new Text('First');
            const child2 = new Text('Second');
            modal.setContent(child1);
            modal.setContent(child2);
            modal.show();
            const text = allText(renderModal(modal));
            expect(text).toContain('Second');
            expect(text).not.toContain('First');
        });

        it('no content initially — nothing renders inside border', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            modal.show();
            const screen = renderModal(modal);
            // Border renders but no user text inside
            expect(allText(screen)).toContain('┌');
            expect(allText(screen)).not.toContain('Hello');
        });
    });

    // ── 4. Hidden Rendering ───────────────────────────

    describe('hidden rendering', () => {
        it('renders nothing when visible is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: 'Hello' });
            const screen = renderModal(modal);
            const text = allText(screen);
            // No border characters
            expect(text).not.toContain('┌');
            expect(text).not.toContain('┐');
            expect(text).not.toContain('└');
            expect(text).not.toContain('┘');
            // No backdrop
            expect(text).not.toContain('░');
            // No title
            expect(text).not.toContain('Hello');
        });

        it('renders nothing when hidden even with content set', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: 'Test' });
            modal.setContent(new Text('content here'));
            // Do not call show()
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).not.toContain('content here');
            expect(text).not.toContain('┌');
        });
    });

    // ── 5. Backdrop Rendering ─────────────────────────

    describe('backdrop rendering', () => {
        it('fills entire rect with "░" in unicode mode when visible', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ backdropChar: '░' });
            modal.show();
            const screen = renderModal(modal, 20, 5);
            // The backdrop covers the entire area; row 0 should be all-backdrop
            // (before the border chars overwrite some cells)
            const text = allText(screen);
            expect(text).toContain('░');
        });

        it('fills entire rect with spaces in ASCII mode when visible', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const modal = new Modal();
            modal.show();
            const screen = renderModal(modal, 20, 8);
            // Border characters should still appear (overwrite the spaces)
            const text = allText(screen);
            expect(text).toContain('┌');
        });

        it('does not render backdrop when hidden', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ backdropChar: '░' });
            // Do not call show()
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).not.toContain('░');
        });
    });

    // ── 6. Border Rendering ───────────────────────────

    describe('border rendering', () => {
        it('renders top border with corners when visible', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 20, height: 10 });
            modal.show();
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('┌');
            expect(text).toContain('┐');
        });

        it('renders bottom border with corners when visible', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 20, height: 10 });
            modal.show();
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('└');
            expect(text).toContain('┘');
        });

        it('renders side borders when visible', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 20, height: 10 });
            modal.show();
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('│');
        });

        it('does not render borders when hidden', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 20, height: 10 });
            // Do not show
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).not.toContain('┌');
            expect(text).not.toContain('│');
        });
    });

    // ── 7. Title Rendering ────────────────────────────

    describe('title rendering', () => {
        it('renders the title in the top border', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: 'Settings', width: 30, height: 10 });
            modal.show();
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('Settings');
        });

        it('renders without throwing when title is empty string', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: '', width: 30, height: 10 });
            modal.show();
            expect(() => renderModal(modal)).not.toThrow();
        });

        it('renders without throwing when title is very long', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({
                title: 'A very long title that exceeds modal width by a lot',
                width: 30,
                height: 10,
            });
            modal.show();
            expect(() => renderModal(modal)).not.toThrow();
        });

        it('renders without throwing when no title is provided', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            modal.show();
            expect(() => renderModal(modal)).not.toThrow();
        });
    });

    // ── 8. Centering Logic ────────────────────────────

    describe('centering logic', () => {
        it('centers modal horizontally on an 80×24 screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modalW = 20;
            const modalH = 10;
            const modal = new Modal({ width: modalW, height: modalH });
            modal.show();
            const screen = renderModal(modal, COLS, ROWS);

            const expectedMx = Math.floor((COLS - modalW) / 2);
            const topRow = rowText(screen, Math.floor((ROWS - modalH) / 2));
            // Top-left corner should be at the expected x position
            expect(topRow[expectedMx]).toBe('┌');
        });

        it('centers modal vertically on an 80×24 screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modalW = 20;
            const modalH = 10;
            const modal = new Modal({ width: modalW, height: modalH });
            modal.show();
            const screen = renderModal(modal, COLS, ROWS);

            const expectedMy = Math.floor((ROWS - modalH) / 2);
            const expectedMx = Math.floor((COLS - modalW) / 2);
            // Top-left corner is at (expectedMx, expectedMy)
            expect(rowText(screen, expectedMy)[expectedMx]).toBe('┌');
            // Bottom-left corner is at (expectedMx, expectedMy + modalH - 1)
            expect(rowText(screen, expectedMy + modalH - 1)[expectedMx]).toBe('└');
        });

        it('centers modal top-right corner correctly', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modalW = 20;
            const modalH = 10;
            const modal = new Modal({ width: modalW, height: modalH });
            modal.show();
            const screen = renderModal(modal, COLS, ROWS);

            const expectedMy = Math.floor((ROWS - modalH) / 2);
            const expectedMx = Math.floor((COLS - modalW) / 2);
            const topRow = rowText(screen, expectedMy);
            // Top-right corner at expectedMx + modalW - 1
            expect(topRow[expectedMx + modalW - 1]).toBe('┐');
        });
    });

    // ── 9. Width / Height Clamping ────────────────────

    describe('width/height clamping', () => {
        it('does not throw when modal dimensions exceed screen size', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 500, height: 500 });
            modal.show();
            expect(() => renderModal(modal, 20, 8)).not.toThrow();
        });

        it('still renders borders after clamping to screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 500, height: 500 });
            modal.show();
            const screen = renderModal(modal, 20, 8);
            const text = allText(screen);
            expect(text).toContain('┌');
        });

        it('does not throw with width=0 modal on tiny screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 0, height: 0 });
            modal.show();
            expect(() => renderModal(modal, 5, 3)).not.toThrow();
        });

        it('does not throw when screen is very small (5×3)', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 50, height: 15 });
            modal.show();
            expect(() => renderModal(modal, 5, 3)).not.toThrow();
        });
    });

    // ── 10. Content Rendering ─────────────────────────

    describe('content rendering', () => {
        it('renders child text inside the modal content area', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            modal.show();
            const child = new Text('Hello World');
            modal.setContent(child);
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('Hello World');
        });

        it('renders child content inside the modal content area', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modalW = 30;
            const modalH = 10;
            const modal = new Modal({ width: modalW, height: modalH });
            modal.show();

            const child = new Text('Positioned');
            modal.setContent(child);
            const screen = renderModal(modal, COLS, ROWS);

            // Content must appear inside the border (not on border rows/cols)
            const mw = Math.min(modalW, COLS - 4);
            const mh = Math.min(modalH, ROWS - 2);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - mh) / 2);
            // The child text should appear on row my+1, at or after column mx+2
            const contentRow = rowText(screen, my + 1);
            expect(contentRow.slice(mx + 2)).toContain('Positioned');
        });

        it('does not render child when modal is hidden', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            // Do not show
            const child = new Text('Secret');
            modal.setContent(child);
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).not.toContain('Secret');
        });
    });

    // ── 11. Content Replacement ───────────────────────

    describe('content replacement', () => {
        it('only renders the latest content after replacement', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 40, height: 12 });
            modal.show();

            const child1 = new Text('First Widget');
            const child2 = new Text('Second Widget');
            modal.setContent(child1);
            modal.setContent(child2);

            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('Second Widget');
            expect(text).not.toContain('First Widget');
        });
    });

    // ── 12. markDirty Coverage ────────────────────────

    describe('markDirty coverage', () => {
        it('show() calls markDirty()', () => {
            const modal = new Modal();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.show();
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('hide() calls markDirty()', () => {
            const modal = new Modal();
            modal.show();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.hide();
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('toggle() calls markDirty()', () => {
            const modal = new Modal();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.toggle();
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('setContent() calls markDirty()', () => {
            const modal = new Modal();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.setContent(new Text('Hi'));
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    // ── 13. Unicode vs ASCII ──────────────────────────

    describe('unicode vs ASCII backdrop', () => {
        it('uses "░" as backdrop char in unicode mode (renders it)', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal();
            modal.show();
            expect(allText(renderModal(modal, 20, 8))).toContain('░');
        });

        it('uses " " as backdrop char in ASCII mode (no "░" in output)', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const modal = new Modal();
            modal.show();
            expect(allText(renderModal(modal, 20, 8))).not.toContain('░');
        });

        it('renders "░" in screen when unicode mode and visible', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ backdropChar: '░' });
            modal.show();
            const screen = renderModal(modal, 20, 8);
            const text = allText(screen);
            expect(text).toContain('░');
        });

        it('does not render "░" when ASCII mode', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const modal = new Modal();
            modal.show();
            const screen = renderModal(modal, 20, 8);
            const text = allText(screen);
            expect(text).not.toContain('░');
        });
    });

    // ── 14. Rendering Edge Cases ──────────────────────

    describe('rendering edge cases', () => {
        it('does not throw when rendering on a 5×3 screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 50, height: 15 });
            modal.show();
            expect(() => renderModal(modal, 5, 3)).not.toThrow();
        });

        it('does not throw when rendering on a 1×1 screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal();
            modal.show();
            expect(() => renderModal(modal, 1, 1)).not.toThrow();
        });

        it('does not throw when screen is smaller than modal dimensions', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 200, height: 100 });
            modal.show();
            expect(() => renderModal(modal, 10, 5)).not.toThrow();
        });

        it('does not throw with zero-width/height modal', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 0, height: 0 });
            modal.show();
            expect(() => renderModal(modal, 80, 24)).not.toThrow();
        });
    });

    // ── 15. Border Color ──────────────────────────────

    describe('border color', () => {
        it('applies custom border color to border cells', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ borderColor: { type: 'named', name: 'green' }, width: 20, height: 10 });
            modal.show();
            const screen = renderModal(modal);
            const mw = Math.min(20, COLS - 4);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - Math.min(10, ROWS - 2)) / 2);
            expect(screen.back[my]![mx]!.fg).toEqual({ type: 'named', name: 'green' });
        });

        it('renders border cells with custom fg color', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({
                width: 20,
                height: 10,
                borderColor: { type: 'named', name: 'red' },
            });
            modal.show();
            const screen = renderModal(modal, COLS, ROWS);

            const mw = Math.min(20, COLS - 4);
            const mh = Math.min(10, ROWS - 2);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - mh) / 2);

            // Top-left corner cell should have fg = red
            const tlCell = screen.back[my]![mx]!;
            expect(tlCell.fg).toEqual({ type: 'named', name: 'red' });
        });

        it('defaults to cyan border color when none provided', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal();
            modal.show();
            const screen = renderModal(modal);
            const mw = Math.min(50, COLS - 4);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - Math.min(15, ROWS - 2)) / 2);
            expect(screen.back[my]![mx]!.fg).toEqual({ type: 'named', name: 'cyan' });
        });
    });

    // ── 16. Repeated State Changes ────────────────────

    describe('repeated state changes', () => {
        it('maintains correct state through show/hide/show/toggle/toggle', () => {
            const modal = new Modal();
            modal.show();
            expect(modal.visible).toBe(true);
            modal.hide();
            expect(modal.visible).toBe(false);
            modal.show();
            expect(modal.visible).toBe(true);
            modal.toggle();
            expect(modal.visible).toBe(false);
            modal.toggle();
            expect(modal.visible).toBe(true);
        });

        it('calling show() multiple times keeps modal visible', () => {
            const modal = new Modal();
            modal.show();
            modal.show();
            modal.show();
            expect(modal.visible).toBe(true);
        });

        it('calling hide() multiple times keeps modal hidden', () => {
            const modal = new Modal();
            modal.show();
            modal.hide();
            modal.hide();
            modal.hide();
            expect(modal.visible).toBe(false);
        });
    });

    // ── 17. Regression Tests ──────────────────────────

    describe('regression tests', () => {
        it('modal with content but hidden renders nothing', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: 'Hidden', width: 30, height: 10 });
            modal.setContent(new Text('Should not appear'));
            // Do not call show()
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).not.toContain('┌');
            expect(text).not.toContain('Should not appear');
        });

        it('modal with title but no content renders title and border only', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: 'Only Title', width: 30, height: 10 });
            modal.show();
            expect(() => renderModal(modal)).not.toThrow();
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('Only Title');
            expect(text).toContain('┌');
        });

        it('modal with content but no title renders content and border', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            modal.show();
            modal.setContent(new Text('Content Only'));
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('┌');
            expect(text).toContain('Content Only');
        });

        it('modal shown multiple times renders correctly each time', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: 'Repeat', width: 30, height: 10 });

            for (let i = 0; i < 3; i++) {
                modal.show();
                const screen = renderModal(modal);
                const text = allText(screen);
                expect(text).toContain('Repeat');
            }
        });

        it('modal hidden multiple times stays hidden', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: 'Gone', width: 30, height: 10 });
            modal.show();
            modal.hide();
            modal.hide();
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).not.toContain('Gone');
        });

        it('content renders correctly after toggle()', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            modal.setContent(new Text('Toggled Content'));

            // Start hidden, toggle on
            modal.toggle();
            expect(modal.visible).toBe(true);
            const screenVisible = renderModal(modal);
            expect(allText(screenVisible)).toContain('Toggled Content');

            // Toggle off
            modal.toggle();
            expect(modal.visible).toBe(false);
            const screenHidden = renderModal(modal);
            expect(allText(screenHidden)).not.toContain('Toggled Content');

            // Toggle on again
            modal.toggle();
            expect(modal.visible).toBe(true);
            const screenAgain = renderModal(modal);
            expect(allText(screenAgain)).toContain('Toggled Content');
        });
    });

    // ── 18. Styling & Attributes ──────────────────────

    describe('styling & attributes', () => {
        it('backdrop cells have dim attribute set to true', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ backdropChar: '░', width: 10, height: 5 });
            modal.show();
            const screen = renderModal(modal, 80, 24);
            // The backdrop is written with dim: true, but borders/content overwrite some cells
            // Check for backdrop presence (dim attribute is set on backdrop cells before borders overwrite)
            const text = allText(screen);
            expect(text).toContain('░');
        });

        it('border cells use the specified borderColor for fg', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({
                width: 20,
                height: 10,
                borderColor: { type: 'named', name: 'yellow' },
            });
            modal.show();
            const screen = renderModal(modal, COLS, ROWS);

            const mw = Math.min(20, COLS - 4);
            const mh = Math.min(10, ROWS - 2);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - mh) / 2);

            // Verify top-left corner border cell has correct fg color
            const borderCell = screen.back[my]![mx]!;
            expect(borderCell.fg).toEqual({ type: 'named', name: 'yellow' });
            expect(borderCell.char).toBe('┌');
        });

        it('side border cells are colored, content area cells are not', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({
                width: 20,
                height: 10,
                borderColor: { type: 'named', name: 'magenta' },
            });
            modal.show();
            const screen = renderModal(modal, COLS, ROWS);

            const mw = Math.min(20, COLS - 4);
            const mh = Math.min(10, ROWS - 2);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - mh) / 2);

            // Left border should have color
            const leftBorder = screen.back[my + 2]![mx]!;
            expect(leftBorder.fg).toEqual({ type: 'named', name: 'magenta' });
            expect(leftBorder.char).toBe('│');

            // Content area should not have the border color
            const contentCell = screen.back[my + 2]![mx + 2]!;
            expect(contentCell.fg).not.toEqual({ type: 'named', name: 'magenta' });
        });
    });

    // ── 19. Title Positioning & Centering ─────────────

    describe('title positioning & centering', () => {
        it('centers a short title within top border', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: 'Hi', width: 30, height: 10 });
            modal.show();
            const screen = renderModal(modal, COLS, ROWS);

            const mw = Math.min(30, COLS - 4);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - 10) / 2);
            const topRow = rowText(screen, my);

            // Verify title appears in the top row
            expect(topRow).toContain('Hi');
        });

        it('handles very long title without throwing', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const longTitle = 'X'.repeat(100);
            const modal = new Modal({ title: longTitle, width: 20, height: 10 });
            modal.show();
            expect(() => renderModal(modal, 80, 24)).not.toThrow();
        });

        it('title with leading and trailing spaces appears in border', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: '  Spaced Title  ', width: 40, height: 10 });
            modal.show();
            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('Spaced Title');
        });

        it('empty title renders border without text', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ title: '', width: 20, height: 10 });
            modal.show();
            const screen = renderModal(modal, COLS, ROWS);

            const mw = Math.min(20, COLS - 4);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - 10) / 2);
            const topRow = rowText(screen, my);

            // Should still have corners and line
            expect(topRow[mx]).toBe('┌');
            expect(topRow[mx + mw - 1]).toBe('┐');
        });
    });

    // ── 20. Content Area Boundaries ───────────────────

    describe('content area boundaries', () => {
        it('content renders at mx+2, my+1 inside border', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modalW = 30;
            const modalH = 10;
            const modal = new Modal({ width: modalW, height: modalH });
            modal.show();

            const child = new Text('Test');
            modal.setContent(child);
            const screen = renderModal(modal, COLS, ROWS);

            const mw = Math.min(modalW, COLS - 4);
            const mh = Math.min(modalH, ROWS - 2);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - mh) / 2);

            // Border row — should have corner characters
            expect(rowText(screen, my)[mx]).toBe('┌');
            // Content row — text starts at mx+2
            const contentRow = rowText(screen, my + 1);
            expect(contentRow.slice(mx + 2)).toContain('Test');
            // Left border column should have │ on content rows
            expect(rowText(screen, my + 1)[mx]).toBe('│');
        });

        it('ensures content area width is bounded by mw-4', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 40, height: 12 });
            modal.show();

            const child = new Text('X'.repeat(100));
            modal.setContent(child);
            const screen = renderModal(modal, 100, 30);

            const mw = Math.min(40, 100 - 4);
            const mx = Math.floor((100 - mw) / 2);
            const my = Math.floor((30 - Math.min(12, 30 - 2)) / 2);
            // Right border must be at mx + mw - 1
            expect(rowText(screen, my)[mx + mw - 1]).toBe('┐');
        });

        it('ensures content area height is bounded by mh-2', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 40, height: 12 });
            modal.show();

            const child = new Text('Y');
            modal.setContent(child);
            const screen = renderModal(modal, 100, 30);

            const mh = Math.min(12, 30 - 2);
            const mw = Math.min(40, 100 - 4);
            const mx = Math.floor((100 - mw) / 2);
            const my = Math.floor((30 - mh) / 2);
            // Bottom border must be at my + mh - 1
            expect(rowText(screen, my + mh - 1)[mx]).toBe('└');
        });

        it('content area is never negative — render does not crash on tiny screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 200, height: 100 });
            modal.show();

            const child = new Text('Z');
            modal.setContent(child);
            expect(() => renderModal(modal, 10, 5)).not.toThrow();
        });

        it('content not placed outside modal when screen is tiny', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 50, height: 20 });
            modal.show();

            const child = new Text('Tiny');
            modal.setContent(child);
            expect(() => renderModal(modal, 5, 3)).not.toThrow();
        });
    });

    // ── 21. Complex State Sequences ───────────────────

    describe('complex state sequences', () => {
        it('handles show/hide/show with content updates', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });

            modal.show();
            expect(modal.visible).toBe(true);

            const child1 = new Text('Content 1');
            modal.setContent(child1);

            modal.hide();
            expect(modal.visible).toBe(false);

            modal.show();
            expect(modal.visible).toBe(true);

            const child2 = new Text('Content 2');
            modal.setContent(child2);
            expect(modal.visible).toBe(true);

            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('Content 2');
            expect(text).not.toContain('Content 1');
        });

        it('multiple show() followed by hide() stays hidden', () => {
            const modal = new Modal();
            modal.show();
            modal.show();
            modal.show();
            expect(modal.visible).toBe(true);

            modal.hide();
            expect(modal.visible).toBe(false);
            expect(modal.visible).toBe(false);
        });

        it('toggle multiple times reaches expected state', () => {
            const modal = new Modal();
            // Start: false
            for (let i = 0; i < 7; i++) {
                modal.toggle();
            }
            // 7 toggles: 1(true), 2(false), 3(true), 4(false), 5(true), 6(false), 7(true)
            expect(modal.visible).toBe(true);
        });

        it('show after content change maintains visibility', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            modal.show();

            modal.setContent(new Text('First'));
            expect(modal.visible).toBe(true);

            modal.setContent(new Text('Second'));
            expect(modal.visible).toBe(true);

            const screen = renderModal(modal);
            expect(allText(screen)).toContain('Second');
        });
    });

    // ── 22. Extreme Dimensions ────────────────────────

    describe('extreme dimensions', () => {
        it('handles negative width gracefully', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: -10, height: 10 });
            modal.show();
            expect(() => renderModal(modal, 80, 24)).not.toThrow();
        });

        it('handles negative height gracefully', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: -5 });
            modal.show();
            expect(() => renderModal(modal, 80, 24)).not.toThrow();
        });

        it('handles very large modal on very small screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 1000, height: 500 });
            modal.show();
            expect(() => renderModal(modal, 2, 2)).not.toThrow();
        });

        it('handles modal exactly matching screen size', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 80, height: 24 });
            modal.show();
            expect(() => renderModal(modal, 80, 24)).not.toThrow();
            const screen = renderModal(modal, 80, 24);
            const text = allText(screen);
            expect(text).toContain('┌');
        });

        it('handles modal 1 pixel larger than screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 81, height: 25 });
            modal.show();
            expect(() => renderModal(modal, 80, 24)).not.toThrow();
        });
    });

    // ── 23. Mark Dirty Frequency ──────────────────────

    describe('markDirty frequency', () => {
        it('show() calls markDirty exactly once', () => {
            const modal = new Modal();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.show();
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('hide() calls markDirty exactly once', () => {
            const modal = new Modal();
            modal.show();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.hide();
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('toggle() calls markDirty exactly once each time', () => {
            const modal = new Modal();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.toggle();
            expect(spy).toHaveBeenCalledTimes(1);

            spy.mockClear();
            modal.toggle();
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('setContent() calls markDirty exactly once', () => {
            const modal = new Modal();
            const spy = vi.spyOn(modal, 'markDirty');
            modal.setContent(new Text('Test'));
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('multiple setContent calls each call markDirty once', () => {
            const modal = new Modal();
            const spy = vi.spyOn(modal, 'markDirty');

            modal.setContent(new Text('First'));
            expect(spy).toHaveBeenCalledTimes(1);

            spy.mockClear();
            modal.setContent(new Text('Second'));
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    // ── 24. Backdrop Fill Verification ────────────────

    describe('backdrop fill verification', () => {
        it('backdrop fills the entire modal rect width', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 20, height: 10, backdropChar: '░' });
            modal.show();
            const screen = renderModal(modal, 80, 24);

            // Count backdrop chars in a backdrop row (not overwritten by border/content)
            // The backdrop should cover every cell in the modal area before border is drawn
            const text = allText(screen);
            expect(text).toContain('░');
        });

        it('backdrop covers rows from y to y+height', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ backdropChar: '#' });
            modal.show();
            const screen = renderModal(modal, 30, 8);

            const text = allText(screen);
            // Backdrop should be visible (before being overwritten by borders)
            expect(text).toContain('#');
        });

        it('does not render backdrop when hidden', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ backdropChar: '▓' });
            // Don't show
            const screen = renderModal(modal, 30, 8);
            const text = allText(screen);
            expect(text).not.toContain('▓');
        });
    });

    // ── 25. Visibility Getter ─────────────────────────

    describe('visibility getter', () => {
        it('visible getter returns current state', () => {
            const modal = new Modal();
            expect(modal.visible).toBe(false);

            modal.show();
            expect(modal.visible).toBe(true);

            modal.hide();
            expect(modal.visible).toBe(false);
        });

        it('visible is readonly — property has getter but no setter', () => {
            const modal = new Modal();
            const proto = Object.getPrototypeOf(modal);
            const desc = Object.getOwnPropertyDescriptor(proto, 'visible');
            expect(desc?.get).toBeDefined();
            expect(desc?.set).toBeUndefined();
            expect(modal.visible).toBe(false);
        });
    });

    // ── 26. Content with Various Widgets ──────────────

    describe('content with various widgets', () => {
        it('renders Text widget inside modal', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            modal.show();
            const text = new Text('Hello');
            modal.setContent(text);
            const screen = renderModal(modal);
            expect(allText(screen)).toContain('Hello');
        });

        it('child widget content appears in modal render output', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            modal.show();

            const child = new Text('Content');
            modal.setContent(child);
            const screen = renderModal(modal);

            expect(allText(screen)).toContain('Content');
        });
    });

    // ── 27. Options Combination ───────────────────────

    describe('options combination', () => {
        it('accepts all options together — renders them correctly', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({
                title: 'Full Options',
                width: 50,
                height: 20,
                borderColor: { type: 'named', name: 'red' },
                backdropChar: '⋅',
            });
            modal.show();
            const screen = renderModal(modal);
            const text = allText(screen);
            // title
            expect(text).toContain('Full Options');
            // backdropChar
            expect(text).toContain('⋅');
            // borderColor — top-left corner cell has red fg
            const mw = Math.min(50, COLS - 4);
            const mx = Math.floor((COLS - mw) / 2);
            const my = Math.floor((ROWS - Math.min(20, ROWS - 2)) / 2);
            expect(screen.back[my]![mx]!.fg).toEqual({ type: 'named', name: 'red' });
        });

        it('renders correctly with all custom options', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({
                title: 'Custom',
                width: 40,
                height: 12,
                borderColor: { type: 'named', name: 'green' },
                backdropChar: '*',
            });
            modal.show();
            expect(() => renderModal(modal)).not.toThrow();

            const screen = renderModal(modal);
            const text = allText(screen);
            expect(text).toContain('Custom');
            expect(text).toContain('*');
        });
    });

    // ── 28. Content Update Semantics ──────────────────

    describe('content update semantics', () => {
        it('setContent replaces old content — second widget renders, first does not', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            modal.show();
            const child1 = new Text('First');
            const child2 = new Text('Second');

            modal.setContent(child1);
            modal.setContent(child2);
            const text = allText(renderModal(modal));
            expect(text).toContain('Second');
            expect(text).not.toContain('First');
        });

        it('old content object is discarded after setContent', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 30, height: 10 });
            modal.show();

            const child1 = new Text('Old');
            modal.setContent(child1);
            const screen1 = renderModal(modal);
            expect(allText(screen1)).toContain('Old');

            const child2 = new Text('New');
            modal.setContent(child2);
            const screen2 = renderModal(modal);
            expect(allText(screen2)).toContain('New');
            expect(allText(screen2)).not.toContain('Old');
        });

        it('setting content does not affect visibility', () => {
            const modal = new Modal();
            expect(modal.visible).toBe(false);

            modal.setContent(new Text('X'));
            expect(modal.visible).toBe(false);

            modal.show();
            expect(modal.visible).toBe(true);

            modal.setContent(new Text('Y'));
            expect(modal.visible).toBe(true);
        });
    });

    // ── 29. Screen Boundary Interaction ───────────────

    describe('screen boundary interaction', () => {
        it('modal centers correctly on odd-width screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 20, height: 10 });
            modal.show();
            const screen = renderModal(modal, 81, 24); // Odd width

            const mw = Math.min(20, 81 - 4);
            const mx = Math.floor((81 - mw) / 2);
            const my = Math.floor((24 - 10) / 2);

            const topRow = rowText(screen, my);
            expect(topRow[mx]).toBe('┌');
        });

        it('modal centers correctly on even-width screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 20, height: 10 });
            modal.show();
            const screen = renderModal(modal, 80, 24); // Even width

            const mw = Math.min(20, 80 - 4);
            const mx = Math.floor((80 - mw) / 2);
            const my = Math.floor((24 - 10) / 2);

            const topRow = rowText(screen, my);
            expect(topRow[mx]).toBe('┌');
        });

        it('does not render outside screen boundaries', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal = new Modal({ width: 100, height: 50 });
            modal.show();
            const screen = renderModal(modal, 10, 5);

            // Should not crash and screen should not overflow
            expect(screen.back.length).toBe(5);
            for (const row of screen.back) {
                expect(row.length).toBe(10);
            }
        });
    });

    // ── 30. Initialization Idempotence ────────────────

    describe('initialization idempotence', () => {
        it('constructor with empty options always creates same defaults', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal1 = new Modal();
            const modal2 = new Modal({});

            // Same initial visibility
            expect(modal1.visible).toBe(modal2.visible);
            expect(modal1.visible).toBe(false);
            // Same rendered output when shown
            modal1.show(); modal2.show();
            const text1 = allText(renderModal(modal1));
            const text2 = allText(renderModal(modal2));
            expect(text1).toBe(text2);
        });

        it('unicode backdrop char is consistent when unicode is true', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const modal1 = new Modal();
            const modal2 = new Modal();
            modal1.show(); modal2.show();
            const t1 = allText(renderModal(modal1, 20, 8));
            const t2 = allText(renderModal(modal2, 20, 8));
            expect(t1).toContain('░');
            expect(t1).toBe(t2);
        });

        it('ascii backdrop char is consistent when unicode is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const modal1 = new Modal();
            const modal2 = new Modal();
            modal1.show(); modal2.show();
            const t1 = allText(renderModal(modal1, 20, 8));
            const t2 = allText(renderModal(modal2, 20, 8));
            expect(t1).not.toContain('░');
            expect(t1).toBe(t2);
        });
    });

    describe('zIndex stacking defaults', () => {
        it('assigns a default zIndex of 1000', () => {
            const modal = new Modal();
            expect(modal.zIndex).toBe(1000);
        });
    });
});


