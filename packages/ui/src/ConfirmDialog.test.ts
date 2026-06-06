// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for ConfirmDialog widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen } from '@termuijs/core';
import { ConfirmDialog } from './ConfirmDialog.js';

// ── Helpers ───────────────────────────────────────────

const COLS = 60;
const ROWS = 20;

function makeScreen(cols = COLS, rows = ROWS): Screen {
    return new Screen(cols, rows);
}

function renderDialog(dialog: ConfirmDialog, cols = COLS, rows = ROWS): Screen {
    const screen = makeScreen(cols, rows);
    dialog.updateRect({ x: 0, y: 0, width: cols, height: rows });
    dialog.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    return screen.back[row].map((c) => c.char).join('');
}

function allRows(screen: Screen): string[] {
    return screen.back.map((row) => row.map((c) => c.char).join(''));
}

function screenHasContent(screen: Screen): boolean {
    return allRows(screen).some((r) => r.trim().length > 0);
}

afterEach(() => {
    vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────

describe('ConfirmDialog', () => {
    // ── 1. Initial state ──────────────────────────────

    it('starts hidden with focusable=true and default confirm selection without throwing', () => {
        expect(() => {
            const dialog = new ConfirmDialog({ message: 'Delete file?' });
            expect(dialog.visible).toBe(false);
            expect(dialog.focusable).toBe(true);

            // Default selection is confirm — verified via rendering: confirm label is bracketed
            dialog.show();
            const screen = renderDialog(dialog);
            const rows = allRows(screen);
            const buttonRow = rows.find((r) => r.includes('[Yes]') || r.includes('[No]') || r.includes('Yes') || r.includes('No'));
            expect(buttonRow).toBeDefined();
            expect(buttonRow!).toContain('[Yes]');
        }).not.toThrow();
    });

    // ── 2. show() ─────────────────────────────────────

    it('show() makes the dialog visible', () => {
        const dialog = new ConfirmDialog({ message: 'Continue?' });
        expect(dialog.visible).toBe(false);
        dialog.show();
        expect(dialog.visible).toBe(true);
    });

    it('show() resets selection to confirm', () => {
        const dialog = new ConfirmDialog({ message: 'Continue?' });
        dialog.show();
        // Switch to cancel first, then call show() again
        dialog.selectCancel();
        dialog.show();
        // Selection should be confirm again — verified via rendering
        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        const buttonRow = rows.find((r) => r.includes('[Yes]') || r.includes('[No]'));
        expect(buttonRow).toBeDefined();
        expect(buttonRow!).toContain('[Yes]');
        expect(buttonRow!).not.toContain('[No]');
    });

    // ── 3. hide() ─────────────────────────────────────

    it('hide() makes the dialog hidden', () => {
        const dialog = new ConfirmDialog({ message: 'Are you sure?' });
        dialog.show();
        expect(dialog.visible).toBe(true);
        dialog.hide();
        expect(dialog.visible).toBe(false);
    });

    it('hide() produces no rendered output', () => {
        const dialog = new ConfirmDialog({ message: 'Are you sure?' });
        dialog.show();
        dialog.hide();
        const screen = renderDialog(dialog);
        expect(screenHasContent(screen)).toBe(false);
    });

    // ── 4. show() resets previous selection ──────────

    it('show() after selectCancel resets selection back to confirm', () => {
        const dialog = new ConfirmDialog({ message: 'Save changes?' });
        dialog.show();
        dialog.selectCancel();

        // Render to confirm cancel is selected
        const screenBefore = renderDialog(dialog);
        const rowsBefore = allRows(screenBefore);
        const cancelSelected = rowsBefore.find((r) => r.includes('[No]'));
        expect(cancelSelected).toBeDefined();

        // Now show again
        dialog.show();
        const screenAfter = renderDialog(dialog);
        const rowsAfter = allRows(screenAfter);
        const confirmSelected = rowsAfter.find((r) => r.includes('[Yes]'));
        expect(confirmSelected).toBeDefined();
        expect(rowsAfter.find((r) => r.includes('[No]'))).toBeUndefined();
    });

    // ── 5. selectConfirm() ────────────────────────────

    it('selectConfirm() makes confirm the active selection', () => {
        const dialog = new ConfirmDialog({ message: 'Delete?' });
        dialog.show();
        dialog.selectCancel();
        dialog.selectConfirm();

        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        const buttonRow = rows.find((r) => r.includes('[Yes]'));
        expect(buttonRow).toBeDefined();
        expect(buttonRow!).not.toContain('[No]');
    });

    it('selectConfirm() renders confirm button with brackets', () => {
        const dialog = new ConfirmDialog({ message: 'Delete?' });
        dialog.show();
        dialog.selectConfirm();

        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        const buttonRow = rows.find((r) => r.includes('[Yes]'));
        expect(buttonRow).toBeDefined();
    });

    // ── 6. selectCancel() ─────────────────────────────

    it('selectCancel() makes cancel the active selection', () => {
        const dialog = new ConfirmDialog({ message: 'Overwrite?' });
        dialog.show();
        dialog.selectCancel();

        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        const buttonRow = rows.find((r) => r.includes('[No]'));
        expect(buttonRow).toBeDefined();
        expect(buttonRow!).not.toContain('[Yes]');
    });

    it('selectCancel() renders cancel button with brackets', () => {
        const dialog = new ConfirmDialog({ message: 'Overwrite?' });
        dialog.show();
        dialog.selectCancel();

        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        const buttonRow = rows.find((r) => r.includes('[No]'));
        expect(buttonRow).toBeDefined();
    });

    // ── 7. toggleSelection() ──────────────────────────

    it('toggleSelection() switches from confirm to cancel', () => {
        const dialog = new ConfirmDialog({ message: 'Proceed?' });
        dialog.show();
        // Starts at confirm
        dialog.toggleSelection();
        // Now should be cancel
        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        expect(rows.find((r) => r.includes('[No]'))).toBeDefined();
        expect(rows.find((r) => r.includes('[Yes]'))).toBeUndefined();
    });

    it('toggleSelection() switches from cancel back to confirm', () => {
        const dialog = new ConfirmDialog({ message: 'Proceed?' });
        dialog.show();
        dialog.toggleSelection(); // confirm → cancel
        dialog.toggleSelection(); // cancel → confirm
        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        expect(rows.find((r) => r.includes('[Yes]'))).toBeDefined();
        expect(rows.find((r) => r.includes('[No]'))).toBeUndefined();
    });

    // ── 8. Multiple toggle stability ──────────────────

    it('repeatedly toggling alternates selection correctly without invalid state', () => {
        const dialog = new ConfirmDialog({ message: 'Confirm action?' });
        dialog.show();
        const expectedSequence: Array<'confirm' | 'cancel'> = [
            'cancel',  // after 1st toggle
            'confirm', // after 2nd toggle
            'cancel',  // after 3rd toggle
            'confirm', // after 4th toggle
        ];
        for (const expected of expectedSequence) {
            dialog.toggleSelection();
            const screen = renderDialog(dialog);
            const rows = allRows(screen);
            if (expected === 'confirm') {
                expect(rows.find((r) => r.includes('[Yes]'))).toBeDefined();
                expect(rows.find((r) => r.includes('[No]'))).toBeUndefined();
            } else {
                expect(rows.find((r) => r.includes('[No]'))).toBeDefined();
                expect(rows.find((r) => r.includes('[Yes]'))).toBeUndefined();
            }
        }
    });

    // ── 9. Confirm callback execution ─────────────────

    it('confirm() fires onConfirm exactly once, not onCancel, and hides the dialog', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        const dialog = new ConfirmDialog({ message: 'Delete?', onConfirm, onCancel });
        dialog.show();
        dialog.selectConfirm();
        dialog.confirm();

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
        expect(dialog.visible).toBe(false);
    });

    // ── 10. Cancel callback execution ─────────────────

    it('confirm() with cancel selected fires onCancel exactly once, not onConfirm, and hides dialog', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        const dialog = new ConfirmDialog({ message: 'Delete?', onConfirm, onCancel });
        dialog.show();
        dialog.selectCancel();
        dialog.confirm();

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
        expect(dialog.visible).toBe(false);
    });

    // ── 11. Missing callbacks ─────────────────────────

    it('confirm() with confirm selected does not throw when onConfirm is absent', () => {
        const dialog = new ConfirmDialog({ message: 'Delete?' });
        dialog.show();
        dialog.selectConfirm();
        expect(() => dialog.confirm()).not.toThrow();
        expect(dialog.visible).toBe(false);
    });

    it('confirm() with cancel selected does not throw when onCancel is absent', () => {
        const dialog = new ConfirmDialog({ message: 'Delete?' });
        dialog.show();
        dialog.selectCancel();
        expect(() => dialog.confirm()).not.toThrow();
        expect(dialog.visible).toBe(false);
    });

    // ── 12. Dialog hides after confirmation ───────────

    it('dialog becomes hidden after confirm() regardless of selection', () => {
        const dialog = new ConfirmDialog({ message: 'Close?' });

        dialog.show();
        dialog.selectConfirm();
        dialog.confirm();
        expect(dialog.visible).toBe(false);

        dialog.show();
        dialog.selectCancel();
        dialog.confirm();
        expect(dialog.visible).toBe(false);
    });

    // ── 13. Rendering while hidden ────────────────────

    it('renders nothing on screen while hidden (immediately after construction)', () => {
        const dialog = new ConfirmDialog({ message: 'Confirm?' });
        // Do not call show()
        const screen = renderDialog(dialog);
        expect(screenHasContent(screen)).toBe(false);
    });

    // ── 14. Rendering while visible ───────────────────

    it('renders message text, borders, and action buttons when visible', () => {
        const dialog = new ConfirmDialog({ message: 'Delete file?' });
        dialog.show();
        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        const allText = rows.join('');

        // Message should appear
        expect(allText).toContain('Delete file?');
        // Border characters should appear
        expect(allText).toContain('┌');
        expect(allText).toContain('┐');
        expect(allText).toContain('└');
        expect(allText).toContain('┘');
        // Button labels should appear
        expect(allText).toContain('Yes');
        expect(allText).toContain('No');
    });

    // ── 15. Confirm highlight rendering ──────────────

    it('confirm button appears with brackets when confirm is selected; cancel does not', () => {
        const dialog = new ConfirmDialog({ message: 'Confirm?' });
        dialog.show();
        dialog.selectConfirm();

        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        const buttonRow = rows.find((r) => r.includes('Yes'));
        expect(buttonRow).toBeDefined();
        // Bracketed confirm
        expect(buttonRow!).toContain('[Yes]');
        // Cancel not bracketed
        expect(buttonRow!).not.toContain('[No]');
    });

    it('confirm button cell uses bold attribute when confirm is selected', () => {
        const dialog = new ConfirmDialog({ message: 'Confirm?' });
        dialog.show();
        dialog.selectConfirm();

        const screen = renderDialog(dialog);
        // Find the row with buttons (by+3 relative to centered box)
        const byStart = Math.floor((ROWS - 5) / 2);
        const buttonRowIndex = byStart + 3;
        const buttonRow = screen.back[buttonRowIndex];

        // Find the cell for '[' of '[Yes]' — at bx+2
        const bw = Math.min(40, COLS - 4);
        const bx = Math.floor((COLS - bw) / 2);
        const yesCell = buttonRow[bx + 2];
        expect(yesCell).toBeDefined();
        expect(yesCell.bold).toBe(true);
    });

    // ── 16. Cancel highlight rendering ───────────────

    it('cancel button appears with brackets when cancel is selected; confirm does not', () => {
        const dialog = new ConfirmDialog({ message: 'Cancel?' });
        dialog.show();
        dialog.selectCancel();

        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        const buttonRow = rows.find((r) => r.includes('No'));
        expect(buttonRow).toBeDefined();
        // Bracketed cancel
        expect(buttonRow!).toContain('[No]');
        // Confirm not bracketed
        expect(buttonRow!).not.toContain('[Yes]');
    });

    it('cancel button cell uses bold attribute when cancel is selected', () => {
        const dialog = new ConfirmDialog({ message: 'Cancel?' });
        dialog.show();
        dialog.selectCancel();

        const screen = renderDialog(dialog);
        const byStart = Math.floor((ROWS - 5) / 2);
        const buttonRowIndex = byStart + 3;
        const buttonRow = screen.back[buttonRowIndex];

        const bw = Math.min(40, COLS - 4);
        const bx = Math.floor((COLS - bw) / 2);
        // yesStr when confirm not selected: '  Yes  ' (7 chars) + 2 padding before noStr
        const yesStr = '  Yes  ';
        const noOffset = bx + 2 + yesStr.length + 2;
        const noCell = buttonRow[noOffset];
        expect(noCell).toBeDefined();
        expect(noCell.bold).toBe(true);
    });

    // ── 17. Custom labels ─────────────────────────────

    it('renders custom confirmLabel and cancelLabel', () => {
        const dialog = new ConfirmDialog({
            message: 'Remove item?',
            confirmLabel: 'Delete',
            cancelLabel: 'Keep',
        });
        dialog.show();
        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        const allText = rows.join('');
        expect(allText).toContain('Delete');
        expect(allText).toContain('Keep');
        // Default labels should not appear
        expect(allText).not.toContain('Yes');
        expect(allText).not.toContain('No');
    });

    it('custom labels: selection brackets render correctly', () => {
        const dialog = new ConfirmDialog({
            message: 'Remove?',
            confirmLabel: 'Delete',
            cancelLabel: 'Keep',
        });
        dialog.show();
        dialog.selectConfirm();
        const screenConfirm = renderDialog(dialog);
        expect(allRows(screenConfirm).join('')).toContain('[Delete]');

        dialog.selectCancel();
        const screenCancel = renderDialog(dialog);
        expect(allRows(screenCancel).join('')).toContain('[Keep]');
    });

    // ── 18. Long message clipping ─────────────────────

    it('very long message renders stably without out-of-bounds writes', () => {
        const longMsg = 'A'.repeat(500);
        const dialog = new ConfirmDialog({ message: longMsg });
        dialog.show();
        expect(() => {
            const screen = renderDialog(dialog);
            // Message should be clipped; no full 500-char string in any row
            const rows = allRows(screen);
            for (const row of rows) {
                // Each row is at most COLS wide
                expect(row.length).toBeLessThanOrEqual(COLS);
            }
        }).not.toThrow();
    });

    it('long message: rendered message is clipped to fit dialog width', () => {
        const longMsg = 'X'.repeat(200);
        const dialog = new ConfirmDialog({ message: longMsg });
        dialog.show();
        const screen = renderDialog(dialog);
        const rows = allRows(screen);
        // The rendered message must be shorter than or equal to bw - 4 (max 36 for width=60)
        const bw = Math.min(40, COLS - 4);
        const maxMsgLen = bw - 4;
        // Find the row with message content (X chars)
        const msgRow = rows.find((r) => r.includes('X'));
        expect(msgRow).toBeDefined();
        const xCount = (msgRow!.match(/X/g) ?? []).length;
        expect(xCount).toBeLessThanOrEqual(maxMsgLen);
    });

    // ── 19. Small width rendering ─────────────────────

    it('renders stably on a narrow screen (width=10) without exceptions', () => {
        const dialog = new ConfirmDialog({ message: 'Hi?' });
        dialog.show();
        expect(() => {
            dialog.updateRect({ x: 0, y: 0, width: 10, height: 20 });
            const screen = new Screen(10, 20);
            dialog.render(screen);
        }).not.toThrow();
    });

    // ── 20. Small height rendering ────────────────────

    it('renders stably on a short screen (height=5) without exceptions', () => {
        const dialog = new ConfirmDialog({ message: 'OK?' });
        dialog.show();
        expect(() => {
            dialog.updateRect({ x: 0, y: 0, width: 60, height: 5 });
            const screen = new Screen(60, 5);
            dialog.render(screen);
        }).not.toThrow();
    });

    // ── 21. Zero width rendering ──────────────────────

    it('exits rendering safely with width=0', () => {
        const dialog = new ConfirmDialog({ message: 'Delete?' });
        dialog.show();
        expect(() => {
            dialog.updateRect({ x: 0, y: 0, width: 0, height: 20 });
            const screen = new Screen(1, 20); // Screen must be at least 1x1
            dialog.render(screen);
        }).not.toThrow();
    });

    // ── 22. Zero height rendering ─────────────────────

    it('exits rendering safely with height=0', () => {
        const dialog = new ConfirmDialog({ message: 'Delete?' });
        dialog.show();
        expect(() => {
            dialog.updateRect({ x: 0, y: 0, width: 60, height: 0 });
            const screen = new Screen(60, 1); // Screen must be at least 1x1
            dialog.render(screen);
        }).not.toThrow();
    });

    // ── 23. Border color usage ────────────────────────

    it('border cells use the configured borderColor', () => {
        const dialog = new ConfirmDialog({
            message: 'Color test',
            borderColor: { type: 'named', name: 'red' },
        });
        dialog.show();
        const screen = renderDialog(dialog);

        // The top-left border corner cell should use red fg
        const bw = Math.min(40, COLS - 4);
        const bx = Math.floor((COLS - bw) / 2);
        const by = Math.floor((ROWS - 5) / 2);
        const cornerCell = screen.back[by][bx];
        expect(cornerCell).toBeDefined();
        expect(cornerCell.fg).toEqual({ type: 'named', name: 'red' });
    });

    it('internal content cells are not affected by borderColor', () => {
        const dialog = new ConfirmDialog({
            message: 'Color test',
            borderColor: { type: 'named', name: 'red' },
        });
        dialog.show();
        const screen = renderDialog(dialog);

        // Interior row (by+1): the space-filled area between borders should not have red fg
        const bw = Math.min(40, COLS - 4);
        const bx = Math.floor((COLS - bw) / 2);
        const by = Math.floor((ROWS - 5) / 2);
        // Check a cell in the middle of the interior row (by+1, bx+2)
        const interiorCell = screen.back[by + 1][bx + 2];
        expect(interiorCell).toBeDefined();
        // Interior space should not be red
        const fg = interiorCell.fg as { type: string; name: string } | undefined;
        expect(fg?.name).not.toBe('red');
    });

    // ── 24. Repeated show/hide cycles ────────────────

    it('visibility remains correct and selection resets across repeated show/hide cycles', () => {
        const dialog = new ConfirmDialog({ message: 'Repeat?' });

        for (let i = 0; i < 4; i++) {
            dialog.show();
            expect(dialog.visible).toBe(true);

            // Selection should always reset to confirm
            const screenAfterShow = renderDialog(dialog);
            expect(allRows(screenAfterShow).join('')).toContain('[Yes]');

            // Toggle to cancel then hide
            dialog.selectCancel();
            dialog.hide();
            expect(dialog.visible).toBe(false);
        }
    });

    it('no stale state after repeated show/hide: screen is blank while hidden', () => {
        const dialog = new ConfirmDialog({ message: 'Stale?' });

        dialog.show();
        dialog.hide();
        dialog.show();
        dialog.hide();

        const screen = renderDialog(dialog);
        expect(screenHasContent(screen)).toBe(false);
    });
});
