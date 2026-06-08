// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for MenuBar widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { MenuBar } from './MenuBar.js';

// ── Helpers ────────────────────────────────────────────

const key = (k: string) => ({ key: k } as any);

const makeMenus = (action1 = vi.fn(), action2 = vi.fn()) => [
    {
        label: 'File',
        items: [
            { label: 'New', action: action1 },
            { label: 'Open', disabled: true },
            { label: 'Save', action: action2 },
        ],
    },
    {
        label: 'Edit',
        items: [
            { label: 'Copy' },
            { label: 'Paste' },
        ],
    },
];

const render = (mb: MenuBar, width = 40, height = 10) => {
    mb.updateRect({ x: 0, y: 0, width, height });
    const screen = new Screen(width, height);
    mb.render(screen);
    return screen;
};

const row = (screen: Screen, r: number) =>
    screen.back[r]?.map(c => c.char).join('') ?? '';

// ── Original Tests (preserved) ─────────────────────────

describe('MenuBar', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes in correct state', () => {
        const mb = new MenuBar(makeMenus());
        expect(mb.activeMenu).toBe(0);
        expect(mb.isOpen).toBe(false);
        expect(mb.activeItem).toBe(-1);
    });

    it('all menu labels render on row 0', () => {
        const mb = new MenuBar(makeMenus());
        const screen = render(mb);

        const row0 = row(screen, 0);
        expect(row0).toContain('File');
        expect(row0).toContain('Edit');
    });

    it('right key moves active menu', () => {
        const mb = new MenuBar(makeMenus());
        mb.handleKey(key('right'));
        expect(mb.activeMenu).toBe(1);

        mb.handleKey(key('right'));
        expect(mb.activeMenu).toBe(0); // wraps around

        mb.handleKey(key('left'));
        expect(mb.activeMenu).toBe(1); // wraps around left
    });

    it('enter opens dropdown', () => {
        const mb = new MenuBar(makeMenus());
        mb.handleKey(key('enter'));
        expect(mb.isOpen).toBe(true);
        expect(mb.activeItem).toBe(0); // first enabled item (New)
    });

    it('down key moves item selection in dropdown', () => {
        const mb = new MenuBar(makeMenus());
        mb.handleKey(key('enter')); // Open
        expect(mb.activeItem).toBe(0); // New

        mb.handleKey(key('down'));
        expect(mb.activeItem).toBe(2); // Skips Open (disabled) and goes to Save

        mb.handleKey(key('down'));
        expect(mb.activeItem).toBe(0); // Wraps around to New
    });

    it('enter fires action and closes dropdown', () => {
        const action1 = vi.fn();
        const action2 = vi.fn();
        const mb = new MenuBar(makeMenus(action1, action2));

        mb.handleKey(key('enter')); // Open, activeItem is 0 (New)
        mb.handleKey(key('down'));  // activeItem is 2 (Save)
        mb.handleKey(key('enter')); // Trigger Save

        expect(action2).toHaveBeenCalledTimes(1);
        expect(action1).not.toHaveBeenCalled();
        expect(mb.isOpen).toBe(false);
    });

    it('escape closes dropdown', () => {
        const mb = new MenuBar(makeMenus());
        mb.handleKey(key('enter')); // Open
        expect(mb.isOpen).toBe(true);

        mb.handleKey(key('escape')); // Close
        expect(mb.isOpen).toBe(false);
    });

    it('renders with unicode caps', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const mb = new MenuBar(makeMenus());
        mb.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        const screen = new Screen(40, 5);

        mb.handleKey(key('enter')); // open
        mb.render(screen);

        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toContain('● New');
    });

    it('renders with non-unicode caps (fallback)', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const mb = new MenuBar(makeMenus());
        mb.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        const screen = new Screen(40, 5);

        mb.handleKey(key('enter')); // open
        mb.render(screen);

        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toContain('* New');
    });

    // ── 1. Constructor & Initial State ─────────────────

    describe('constructor & initial state', () => {
        it('activeMenu starts at 0', () => {
            const mb = new MenuBar(makeMenus());
            expect(mb.activeMenu).toBe(0);
        });

        it('activeItem starts at -1', () => {
            const mb = new MenuBar(makeMenus());
            expect(mb.activeItem).toBe(-1);
        });

        it('isOpen starts as false', () => {
            const mb = new MenuBar(makeMenus());
            expect(mb.isOpen).toBe(false);
        });

        it('empty menu array initializes safely', () => {
            expect(() => new MenuBar([])).not.toThrow();
        });

        it('empty MenuBar has correct initial state', () => {
            const mb = new MenuBar([]);
            expect(mb.activeMenu).toBe(0);
            expect(mb.activeItem).toBe(-1);
            expect(mb.isOpen).toBe(false);
        });

        it('single-menu configuration initializes correctly', () => {
            const mb = new MenuBar([{ label: 'File', items: [{ label: 'New' }] }]);
            expect(mb.activeMenu).toBe(0);
            expect(mb.menus.length).toBe(1);
        });
    });

    // ── 2. Menu Navigation ─────────────────────────────

    describe('menu navigation', () => {
        it('right arrow moves to next menu', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('right'));
            expect(mb.activeMenu).toBe(1);
        });

        it('right arrow wraps from last menu to first', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('right')); // 0 → 1
            mb.handleKey(key('right')); // 1 → 0 (wrap)
            expect(mb.activeMenu).toBe(0);
        });

        it('left arrow moves to previous menu', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('right')); // 0 → 1
            mb.handleKey(key('left'));  // 1 → 0
            expect(mb.activeMenu).toBe(0);
        });

        it('left arrow wraps from first menu to last', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('left')); // 0 → 1 (wrap)
            expect(mb.activeMenu).toBe(1);
        });

        it('switching menus while open updates activeMenu and re-initializes activeItem', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // open File
            expect(mb.activeMenu).toBe(0);

            mb.handleKey(key('right')); // switch to Edit while open
            expect(mb.activeMenu).toBe(1);
            expect(mb.activeItem).toBe(0); // first enabled item in Edit (Copy)
            expect(mb.isOpen).toBe(true);
        });

        it('switching menus while open with left arrow behaves correctly', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('right'));  // move to Edit first
            mb.handleKey(key('enter')); // open Edit
            mb.handleKey(key('left'));  // switch back to File while open
            expect(mb.activeMenu).toBe(0);
            expect(mb.isOpen).toBe(true);
            expect(mb.activeItem).toBe(0); // New (first enabled in File)
        });
    });

    // ── 3. Dropdown Opening ────────────────────────────

    describe('dropdown opening', () => {
        it('enter opens dropdown and isOpen becomes true', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            expect(mb.isOpen).toBe(true);
        });

        it('enter selects first enabled item (skips disabled at front)', () => {
            const mb = new MenuBar([{
                label: 'File',
                items: [
                    { label: 'Open', disabled: true },
                    { label: 'Save' },
                ],
            }]);
            mb.handleKey(key('enter'));
            expect(mb.activeItem).toBe(1); // Skip disabled Open, land on Save
        });

        it('enter with all items disabled sets activeItem to -1', () => {
            const mb = new MenuBar([{
                label: 'File',
                items: [
                    { label: 'A', disabled: true },
                    { label: 'B', disabled: true },
                ],
            }]);
            mb.handleKey(key('enter'));
            expect(mb.activeItem).toBe(-1);
        });

        it('enter on menu with no items sets activeItem to -1 and opens safely', () => {
            const mb = new MenuBar([{ label: 'Empty', items: [] }]);
            expect(() => mb.handleKey(key('enter'))).not.toThrow();
            expect(mb.isOpen).toBe(true);
            expect(mb.activeItem).toBe(-1);
        });

        it('enter on normal menu selects first enabled item when first item is enabled', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            expect(mb.activeItem).toBe(0); // 'New' is enabled
        });
    });

    // ── 4. Dropdown Navigation ─────────────────────────

    describe('dropdown navigation', () => {
        it('down arrow advances item selection', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // open → activeItem = 0 (New)
            mb.handleKey(key('down'));
            expect(mb.activeItem).toBe(2); // skips disabled 'Open', lands on 'Save'
        });

        it('down arrow wraps from last enabled to first enabled', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // activeItem = 0 (New)
            mb.handleKey(key('down'));  // activeItem = 2 (Save)
            mb.handleKey(key('down'));  // wraps → 0 (New)
            expect(mb.activeItem).toBe(0);
        });

        it('up arrow moves selection upward', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // activeItem = 0 (New)
            mb.handleKey(key('down'));  // activeItem = 2 (Save)
            mb.handleKey(key('up'));    // should go back to 0 (New), skipping disabled
            expect(mb.activeItem).toBe(0);
        });

        it('up arrow wraps from first to last enabled', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // activeItem = 0 (New)
            mb.handleKey(key('up'));    // wraps → 2 (Save)
            expect(mb.activeItem).toBe(2);
        });

        it('down skips disabled items in sequence: enabled, disabled, enabled', () => {
            const mb = new MenuBar([{
                label: 'Menu',
                items: [
                    { label: 'A' },
                    { label: 'B', disabled: true },
                    { label: 'C' },
                ],
            }]);
            mb.handleKey(key('enter')); // activeItem = 0 (A)
            mb.handleKey(key('down'));
            expect(mb.activeItem).toBe(2); // jumps over disabled B → C
        });

        it('up skips disabled items', () => {
            const mb = new MenuBar([{
                label: 'Menu',
                items: [
                    { label: 'A' },
                    { label: 'B', disabled: true },
                    { label: 'C' },
                ],
            }]);
            mb.handleKey(key('enter')); // activeItem = 0 (A)
            mb.handleKey(key('down'));  // activeItem = 2 (C)
            mb.handleKey(key('up'));
            expect(mb.activeItem).toBe(0); // jumps over disabled B → A
        });

        it('down/up do nothing when dropdown is closed', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('down'));
            expect(mb.activeItem).toBe(-1);
            mb.handleKey(key('up'));
            expect(mb.activeItem).toBe(-1);
        });
    });

    // ── 5. Action Execution ────────────────────────────

    describe('action execution', () => {
        it('enter executes active action', () => {
            const action = vi.fn();
            const mb = new MenuBar([{
                label: 'File',
                items: [{ label: 'New', action }],
            }]);
            mb.handleKey(key('enter')); // open, activeItem = 0
            mb.handleKey(key('enter')); // execute
            expect(action).toHaveBeenCalledTimes(1);
        });

        it('correct callback fires, wrong one does not', () => {
            const action1 = vi.fn();
            const action2 = vi.fn();
            const mb = new MenuBar(makeMenus(action1, action2));

            mb.handleKey(key('enter')); // open → activeItem = 0 (New → action1)
            mb.handleKey(key('enter')); // execute New

            expect(action1).toHaveBeenCalledTimes(1);
            expect(action2).not.toHaveBeenCalled();
        });

        it('dropdown closes after action execution', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // open
            mb.handleKey(key('enter')); // execute
            expect(mb.isOpen).toBe(false);
        });

        it('item without action closes dropdown without throwing', () => {
            const mb = new MenuBar([{
                label: 'View',
                items: [{ label: 'Zoom In' }], // no action property
            }]);
            mb.handleKey(key('enter')); // open
            expect(() => mb.handleKey(key('enter'))).not.toThrow(); // execute
            expect(mb.isOpen).toBe(false);
        });

        it('executing action with activeItem = -1 does nothing', () => {
            const action = vi.fn();
            const mb = new MenuBar([{
                label: 'File',
                items: [{ label: 'A', disabled: true, action }],
            }]);
            mb.handleKey(key('enter')); // open, all disabled → activeItem = -1
            mb.handleKey(key('enter')); // attempt execute
            expect(action).not.toHaveBeenCalled();
        });
    });

    // ── 6. Disabled Items ──────────────────────────────

    describe('disabled items', () => {
        it('disabled items are never executed', () => {
            const action = vi.fn();
            const mb = new MenuBar([{
                label: 'File',
                items: [
                    { label: 'Open', disabled: true, action },
                ],
            }]);
            mb.handleKey(key('enter')); // open, all disabled → activeItem = -1
            mb.handleKey(key('enter')); // attempt execute
            expect(action).not.toHaveBeenCalled();
        });

        it('navigation skips disabled items when moving down', () => {
            const mb = new MenuBar([{
                label: 'Menu',
                items: [
                    { label: 'A' },
                    { label: 'B', disabled: true },
                    { label: 'C', disabled: true },
                    { label: 'D' },
                ],
            }]);
            mb.handleKey(key('enter')); // open → activeItem = 0 (A)
            mb.handleKey(key('down'));
            expect(mb.activeItem).toBe(3); // skips B and C, lands on D
        });

        it('navigation skips disabled items when moving up', () => {
            const mb = new MenuBar([{
                label: 'Menu',
                items: [
                    { label: 'A' },
                    { label: 'B', disabled: true },
                    { label: 'C', disabled: true },
                    { label: 'D' },
                ],
            }]);
            mb.handleKey(key('enter')); // open → activeItem = 0 (A)
            mb.handleKey(key('down'));  // → 3 (D)
            mb.handleKey(key('up'));
            expect(mb.activeItem).toBe(0); // skips C and B, lands on A
        });

        it('disabled first item is skipped on open', () => {
            const mb = new MenuBar([{
                label: 'File',
                items: [
                    { label: 'Open', disabled: true },
                    { label: 'Save' },
                ],
            }]);
            mb.handleKey(key('enter'));
            expect(mb.activeItem).toBe(1);
        });

        it('disabled last item is skipped during up-wrap navigation', () => {
            const mb = new MenuBar([{
                label: 'File',
                items: [
                    { label: 'New' },
                    { label: 'Open', disabled: true },
                ],
            }]);
            mb.handleKey(key('enter')); // open → activeItem = 0 (New)
            mb.handleKey(key('up'));    // wrap → should land on New (only enabled), not Open
            expect(mb.activeItem).toBe(0);
        });

        it('disabled items render with dim styling (brightBlack fg)', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const mb = new MenuBar(makeMenus());
            mb.updateRect({ x: 0, y: 0, width: 40, height: 5 });
            const screen = new Screen(40, 5);

            mb.handleKey(key('enter')); // open File dropdown
            mb.render(screen);

            // Row 2 = 'Open' (disabled) — verify dim flag on its cells
            const openRow = screen.back[2];
            const openLabel = openRow.map(c => c.char).join('');
            expect(openLabel).toContain('Open');
            // The disabled item cell should have dim=true or brightBlack fg
            const firstOpenCell = openRow.find(c => c.char === 'O');
            expect(firstOpenCell?.dim).toBe(true);
        });
    });

    // ── 7. Escape Handling ─────────────────────────────

    describe('escape handling', () => {
        it('escape closes open dropdown', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            expect(mb.isOpen).toBe(true);
            mb.handleKey(key('escape'));
            expect(mb.isOpen).toBe(false);
        });

        it('escape does nothing when already closed', () => {
            const mb = new MenuBar(makeMenus());
            expect(mb.isOpen).toBe(false);
            expect(() => mb.handleKey(key('escape'))).not.toThrow();
            expect(mb.isOpen).toBe(false);
        });

        it('escape does not alter active menu', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('right'));  // move to Edit (activeMenu = 1)
            mb.handleKey(key('enter')); // open
            mb.handleKey(key('escape'));
            expect(mb.activeMenu).toBe(1);
        });

        it('escape does not reset activeMenu to 0', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('right'));  // activeMenu = 1
            mb.handleKey(key('enter')); // open
            mb.handleKey(key('escape'));
            expect(mb.activeMenu).toBe(1); // stays at 1
        });
    });

    // ── 8. Rendering ───────────────────────────────────

    describe('rendering', () => {
        it('all menu labels appear in row 0', () => {
            const mb = new MenuBar(makeMenus());
            const screen = render(mb);
            const r0 = row(screen, 0);
            expect(r0).toContain('File');
            expect(r0).toContain('Edit');
        });

        it('active menu label appears in row 0', () => {
            const mb = new MenuBar(makeMenus());
            const screen = render(mb);
            // File is active (index 0) — it should appear in row 0
            expect(row(screen, 0)).toContain('File');
        });

        it('dropdown appears below active menu (row 1 onward) when open', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // open File
            const screen = render(mb);

            // Dropdown items start at row 1
            const rows = screen.back.map(r => r.map(c => c.char).join(''));
            const allContent = rows.slice(1).join('\n');
            expect(allContent).toContain('New');
            expect(allContent).toContain('Open');
            expect(allContent).toContain('Save');
        });

        it('dropdown does not appear when closed', () => {
            const mb = new MenuBar(makeMenus());
            const screen = render(mb);

            // No item labels below row 0
            const belowContent = screen.back.slice(1).map(r => r.map(c => c.char).join('').trim()).join('');
            expect(belowContent).toBe('');
        });

        it('selected item is rendered highlighted (with selection indicator)', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // open, activeItem = 0 (New)
            const screen = render(mb);

            expect(row(screen, 1)).toContain('● New');
        });

        it('non-selected items render without selection indicator', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // open, activeItem = 0 (New)
            const screen = render(mb);

            // Save (row 3) should not have ● prefix
            const saveRow = row(screen, 3);
            expect(saveRow).not.toContain('● Save');
            expect(saveRow).toContain('Save');
        });

        it('five menus all render on row 0', () => {
            const mb = new MenuBar([
                { label: 'File', items: [] },
                { label: 'Edit', items: [] },
                { label: 'View', items: [] },
                { label: 'Help', items: [] },
                { label: 'Tools', items: [] },
            ]);
            const screen = render(mb, 80, 5);
            const r0 = row(screen, 0);
            expect(r0).toContain('File');
            expect(r0).toContain('Edit');
            expect(r0).toContain('View');
            expect(r0).toContain('Help');
            expect(r0).toContain('Tools');
        });
    });

    // ── 9. Unicode vs ASCII ────────────────────────────

    describe('unicode vs ASCII indicators', () => {
        it('selected item renders ● in unicode mode', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            const screen = render(mb);
            expect(row(screen, 1)).toContain('● New');
        });

        it('selected item renders * in ASCII mode', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            const screen = render(mb);
            expect(row(screen, 1)).toContain('* New');
        });

        it('unselected item renders with two-space prefix in unicode mode', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // activeItem = 0 (New)
            const screen = render(mb);
            // Save is not selected — should have '  Save' (two spaces)
            expect(row(screen, 3)).not.toContain('●');
            expect(row(screen, 3)).not.toContain('*');
        });

        it('unselected item renders with two-space prefix in ASCII mode', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // activeItem = 0 (New)
            const screen = render(mb);
            expect(row(screen, 3)).not.toContain('●');
            expect(row(screen, 3)).not.toContain('*');
        });

        it('does not render ● when unicode is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            const screen = render(mb);
            const allContent = screen.back.map(r => r.map(c => c.char).join('')).join('\n');
            expect(allContent).not.toContain('●');
        });

        it('does not render * when unicode is true', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            const screen = render(mb);
            // Row 1 is selected — the indicator is '●', not '*'
            expect(row(screen, 1)).not.toMatch(/\* New/);
        });
    });

    // ── 10. markDirty Coverage ─────────────────────────

    describe('markDirty coverage', () => {
        it('markDirty called when active menu changes via right key', () => {
            const mb = new MenuBar(makeMenus());
            const spy = vi.spyOn(mb as any, 'markDirty');
            mb.handleKey(key('right'));
            expect(spy).toHaveBeenCalled();
        });

        it('markDirty called when dropdown opens', () => {
            const mb = new MenuBar(makeMenus());
            const spy = vi.spyOn(mb as any, 'markDirty');
            mb.handleKey(key('enter'));
            expect(spy).toHaveBeenCalled();
        });

        it('markDirty called when dropdown closes via escape', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            const spy = vi.spyOn(mb as any, 'markDirty');
            mb.handleKey(key('escape'));
            expect(spy).toHaveBeenCalled();
        });

        it('markDirty called when item selection changes', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            const spy = vi.spyOn(mb as any, 'markDirty');
            mb.handleKey(key('down'));
            expect(spy).toHaveBeenCalled();
        });

        it('markDirty called when action executes and dropdown closes', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            const spy = vi.spyOn(mb as any, 'markDirty');
            mb.handleKey(key('enter')); // execute and close
            expect(spy).toHaveBeenCalled();
        });

        it('markDirty not called for unrecognized keys', () => {
            const mb = new MenuBar(makeMenus());
            const spy = vi.spyOn(mb as any, 'markDirty');
            mb.handleKey(key('a'));
            mb.handleKey(key('b'));
            mb.handleKey(key('space'));
            mb.handleKey(key('f1'));
            expect(spy).not.toHaveBeenCalled();
        });

        it('markDirty called on left key navigation', () => {
            const mb = new MenuBar(makeMenus());
            const spy = vi.spyOn(mb as any, 'markDirty');
            mb.handleKey(key('left'));
            expect(spy).toHaveBeenCalled();
        });

        it('markDirty called when setMenus is used', () => {
            const mb = new MenuBar(makeMenus());
            const spy = vi.spyOn(mb as any, 'markDirty');
            mb.setMenus(makeMenus());
            expect(spy).toHaveBeenCalled();
        });
    });

    // ── 11. Edge Cases ─────────────────────────────────

    describe('edge cases', () => {
        describe('empty menu list', () => {
            it('no crash on construction', () => {
                expect(() => new MenuBar([])).not.toThrow();
            });

            it('navigation is safe when no menus exist', () => {
                const mb = new MenuBar([]);
                expect(() => mb.handleKey(key('right'))).not.toThrow();
                expect(() => mb.handleKey(key('left'))).not.toThrow();
                expect(mb.activeMenu).toBe(0);
            });

            it('render is safe when no menus exist', () => {
                const mb = new MenuBar([]);
                expect(() => render(mb)).not.toThrow();
            });

            it('enter on empty bar is safe', () => {
                const mb = new MenuBar([]);
                expect(() => mb.handleKey(key('enter'))).not.toThrow();
            });
        });

        describe('menu with no items', () => {
            it('opening menu with no items is safe', () => {
                const mb = new MenuBar([{ label: 'File', items: [] }]);
                expect(() => mb.handleKey(key('enter'))).not.toThrow();
                expect(mb.isOpen).toBe(true);
            });

            it('activeItem stays -1 when menu has no items', () => {
                const mb = new MenuBar([{ label: 'File', items: [] }]);
                mb.handleKey(key('enter'));
                expect(mb.activeItem).toBe(-1);
            });

            it('enter on empty menu is safe (no action to fire)', () => {
                const mb = new MenuBar([{ label: 'File', items: [] }]);
                mb.handleKey(key('enter')); // open
                expect(() => mb.handleKey(key('enter'))).not.toThrow(); // attempt execute
            });

            it('down/up on empty menu do not throw', () => {
                const mb = new MenuBar([{ label: 'File', items: [] }]);
                mb.handleKey(key('enter')); // open
                expect(() => mb.handleKey(key('down'))).not.toThrow();
                expect(() => mb.handleKey(key('up'))).not.toThrow();
                expect(mb.activeItem).toBe(-1);
            });
        });

        describe('all items disabled', () => {
            it('dropdown opens safely when all items disabled', () => {
                const mb = new MenuBar([{
                    label: 'File',
                    items: [
                        { label: 'A', disabled: true },
                        { label: 'B', disabled: true },
                    ],
                }]);
                expect(() => mb.handleKey(key('enter'))).not.toThrow();
                expect(mb.isOpen).toBe(true);
            });

            it('no active item is selected when all items disabled', () => {
                const mb = new MenuBar([{
                    label: 'File',
                    items: [
                        { label: 'A', disabled: true },
                        { label: 'B', disabled: true },
                    ],
                }]);
                mb.handleKey(key('enter'));
                expect(mb.activeItem).toBe(-1);
            });

            it('enter does not execute anything when all items disabled', () => {
                const action = vi.fn();
                const mb = new MenuBar([{
                    label: 'File',
                    items: [
                        { label: 'A', disabled: true, action },
                        { label: 'B', disabled: true, action },
                    ],
                }]);
                mb.handleKey(key('enter')); // open
                mb.handleKey(key('enter')); // attempt execute
                expect(action).not.toHaveBeenCalled();
            });
        });
    });

    // ── 12. Keyboard Robustness ────────────────────────

    describe('keyboard robustness', () => {
        it('unrecognized keys do not alter state when closed', () => {
            const mb = new MenuBar(makeMenus());
            const before = { menu: mb.activeMenu, item: mb.activeItem, open: mb.isOpen };

            for (const k of ['a', 'b', 'space', 'f1', 'home', 'pageup']) {
                mb.handleKey(key(k));
            }

            expect(mb.activeMenu).toBe(before.menu);
            expect(mb.activeItem).toBe(before.item);
            expect(mb.isOpen).toBe(before.open);
        });

        it('unrecognized keys do not alter state when open', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // open

            const menuBefore = mb.activeMenu;
            const itemBefore = mb.activeItem;

            for (const k of ['a', 'b', 'space', 'f1', 'home', 'pageup']) {
                mb.handleKey(key(k));
            }

            expect(mb.activeMenu).toBe(menuBefore);
            expect(mb.activeItem).toBe(itemBefore);
            expect(mb.isOpen).toBe(true);
        });
    });

    // ── 13. Rendering Bounds ───────────────────────────

    describe('rendering bounds', () => {
        it('does not throw when width = 0', () => {
            const mb = new MenuBar(makeMenus());
            mb.updateRect({ x: 0, y: 0, width: 0, height: 5 });
            const screen = new Screen(1, 5);
            expect(() => mb.render(screen)).not.toThrow();
        });

        it('does not throw when height = 0', () => {
            const mb = new MenuBar(makeMenus());
            mb.updateRect({ x: 0, y: 0, width: 40, height: 0 });
            const screen = new Screen(40, 1);
            expect(() => mb.render(screen)).not.toThrow();
        });

        it('does not throw when width = 1', () => {
            const mb = new MenuBar(makeMenus());
            mb.updateRect({ x: 0, y: 0, width: 1, height: 5 });
            const screen = new Screen(1, 5);
            expect(() => mb.render(screen)).not.toThrow();
        });

        it('does not throw when height = 1 and dropdown is open', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            mb.updateRect({ x: 0, y: 0, width: 40, height: 1 });
            const screen = new Screen(40, 5);
            expect(() => mb.render(screen)).not.toThrow();
        });

        it('does not throw on very small dimensions with dropdown open', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));
            mb.updateRect({ x: 0, y: 0, width: 2, height: 2 });
            const screen = new Screen(2, 2);
            expect(() => mb.render(screen)).not.toThrow();
        });
    });

    // ── 14. Multiple Menus ─────────────────────────────

    describe('multiple menus (5 menus)', () => {
        const makeFiveMenus = () => [
            { label: 'File',  items: [{ label: 'New' }, { label: 'Open' }] },
            { label: 'Edit',  items: [{ label: 'Cut' }, { label: 'Copy' }] },
            { label: 'View',  items: [{ label: 'Zoom' }] },
            { label: 'Help',  items: [{ label: 'About' }] },
            { label: 'Tools', items: [{ label: 'Settings' }] },
        ];

        it('navigation wraps from last (Tools) to first (File)', () => {
            const mb = new MenuBar(makeFiveMenus());
            for (let i = 0; i < 5; i++) mb.handleKey(key('right'));
            expect(mb.activeMenu).toBe(0); // wrapped
        });

        it('navigation wraps from first to last via left arrow', () => {
            const mb = new MenuBar(makeFiveMenus());
            mb.handleKey(key('left'));
            expect(mb.activeMenu).toBe(4); // wrapped to Tools
        });

        it('active menu tracking stays accurate through multiple right presses', () => {
            const mb = new MenuBar(makeFiveMenus());
            mb.handleKey(key('right')); // → 1
            mb.handleKey(key('right')); // → 2
            mb.handleKey(key('right')); // → 3
            expect(mb.activeMenu).toBe(3); // Help
        });

        it('switching menus while open positions dropdown at correct menu', () => {
            const mb = new MenuBar(makeFiveMenus());
            mb.handleKey(key('enter')); // open File
            mb.handleKey(key('right')); // switch to Edit
            mb.handleKey(key('right')); // switch to View

            expect(mb.activeMenu).toBe(2);
            expect(mb.isOpen).toBe(true);
        });

        it('all five labels render on row 0', () => {
            const mb = new MenuBar(makeFiveMenus());
            const screen = render(mb, 80, 5);
            const r0 = row(screen, 0);
            expect(r0).toContain('File');
            expect(r0).toContain('Edit');
            expect(r0).toContain('View');
            expect(r0).toContain('Help');
            expect(r0).toContain('Tools');
        });
    });

    // ── 15. Regression Tests ───────────────────────────

    describe('regression tests', () => {
        it('open → close → reopen dropdown restores first enabled item', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter'));  // open, activeItem = 0
            mb.handleKey(key('down'));   // activeItem = 2 (Save)
            mb.handleKey(key('escape')); // close
            mb.handleKey(key('enter'));  // reopen → should re-initialize to 0
            expect(mb.activeItem).toBe(0); // New (first enabled)
            expect(mb.isOpen).toBe(true);
        });

        it('executing action after menu switch fires correct callback', () => {
            const fileAction = vi.fn();
            const editCopy = vi.fn();
            const mb = new MenuBar([
                { label: 'File', items: [{ label: 'New', action: fileAction }] },
                { label: 'Edit', items: [{ label: 'Copy', action: editCopy }] },
            ]);

            mb.handleKey(key('right'));  // switch to Edit
            mb.handleKey(key('enter')); // open Edit
            mb.handleKey(key('enter')); // execute Copy

            expect(editCopy).toHaveBeenCalledTimes(1);
            expect(fileAction).not.toHaveBeenCalled();
        });

        it('switching menus while dropdown is open updates activeMenu', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('enter')); // open File
            expect(mb.activeMenu).toBe(0);

            mb.handleKey(key('right')); // switch to Edit while open
            expect(mb.activeMenu).toBe(1);
            expect(mb.isOpen).toBe(true); // still open
        });

        it('disabled first item: open selects second enabled item', () => {
            const mb = new MenuBar([{
                label: 'File',
                items: [
                    { label: 'A', disabled: true },
                    { label: 'B' },
                    { label: 'C' },
                ],
            }]);
            mb.handleKey(key('enter'));
            expect(mb.activeItem).toBe(1); // B is first enabled
        });

        it('disabled last item: down-wrap skips it', () => {
            const mb = new MenuBar([{
                label: 'File',
                items: [
                    { label: 'A' },
                    { label: 'B' },
                    { label: 'C', disabled: true },
                ],
            }]);
            mb.handleKey(key('enter')); // activeItem = 0 (A)
            mb.handleKey(key('down'));  // → 1 (B)
            mb.handleKey(key('down'));  // would go to 2 (C, disabled) → wraps to 0 (A)
            expect(mb.activeItem).toBe(0);
        });

        it('single enabled item: down stays on same item after wrap', () => {
            const mb = new MenuBar([{
                label: 'File',
                items: [
                    { label: 'Only' },
                ],
            }]);
            mb.handleKey(key('enter')); // activeItem = 0
            mb.handleKey(key('down'));  // wraps → still 0
            expect(mb.activeItem).toBe(0);
        });

        it('multiple consecutive Enter presses: second opens after first closes', () => {
            const action = vi.fn();
            const mb = new MenuBar([{
                label: 'File',
                items: [{ label: 'New', action }],
            }]);

            mb.handleKey(key('enter')); // open
            mb.handleKey(key('enter')); // execute + close
            expect(mb.isOpen).toBe(false);
            expect(action).toHaveBeenCalledTimes(1);

            mb.handleKey(key('enter')); // reopen
            expect(mb.isOpen).toBe(true);

            mb.handleKey(key('enter')); // execute + close again
            expect(mb.isOpen).toBe(false);
            expect(action).toHaveBeenCalledTimes(2);
        });

        it('setMenus resets all state', () => {
            const mb = new MenuBar(makeMenus());
            mb.handleKey(key('right'));  // activeMenu = 1
            mb.handleKey(key('enter')); // open

            mb.setMenus(makeMenus());

            expect(mb.activeMenu).toBe(0);
            expect(mb.isOpen).toBe(false);
            expect(mb.activeItem).toBe(-1);
        });
    });
});
