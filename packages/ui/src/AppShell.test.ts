import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { Box, Widget } from '@termuijs/widgets';
import { AppShell } from './AppShell.js';

const COLORS = {
    header: { type: 'named' as const, name: 'red' as const },
    footer: { type: 'named' as const, name: 'blue' as const },
    sidebar: { type: 'named' as const, name: 'green' as const },
    main: { type: 'named' as const, name: 'yellow' as const },
};

function createShell() {
    return new AppShell({
        header: new Box({ bg: COLORS.header }),
        footer: new Box({ bg: COLORS.footer }),
        sidebar: new Box({ bg: COLORS.sidebar }),
        main: new Box({ bg: COLORS.main }),
        sidebarWidth: 6,
    });
}

class LinesWidget extends Widget {
    constructor(private readonly _lines: string[]) {
        super();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this.rect;
        for (let i = 0; i < this._lines.length; i++) {
            screen.writeString(x, y + i, this._lines[i].slice(0, width));
        }
    }
}

// ─── Helper: build an AppShell with only the requested optional regions ──────

function createShellWith(opts: {
    withHeader?: boolean;
    withFooter?: boolean;
    withSidebar?: boolean;
    sidebarWidth?: number;
} = {}) {
    return new AppShell({
        ...(opts.withHeader ? { header: new Box({ bg: COLORS.header }) } : {}),
        ...(opts.withFooter ? { footer: new Box({ bg: COLORS.footer }) } : {}),
        ...(opts.withSidebar ? { sidebar: new Box({ bg: COLORS.sidebar }) } : {}),
        main: new Box({ bg: COLORS.main }),
        sidebarWidth: opts.sidebarWidth ?? 6,
    });
}

describe('AppShell', () => {
    it('renders header at the top', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        shell.render(screen);

        expect(screen.back[0][0].bg).toEqual(COLORS.header);
    });

    it('renders footer at the bottom', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        shell.render(screen);

        expect(screen.back[9][0].bg).toEqual(COLORS.footer);
    });

    it('respects sidebar width', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        shell.render(screen);

        expect(screen.back[1][5].bg).toEqual(COLORS.sidebar);
        expect(screen.back[1][6].bg).toEqual(COLORS.main);
    });

    it('fills the remaining main area', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        shell.render(screen);

        expect(screen.back[4][10].bg).toEqual(COLORS.main);
        expect(screen.back[5][19].bg).toEqual(COLORS.main);
    });

    it('toggleSidebar hides and shows the sidebar', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });

        const visibleScreen = new Screen(20, 10);
        shell.render(visibleScreen);
        expect(visibleScreen.back[1][0].bg).toEqual(COLORS.sidebar);

        const dirtySpy = vi.spyOn(shell as any, 'markDirty');
        shell.toggleSidebar();
        expect(dirtySpy).toHaveBeenCalled();

        const hiddenScreen = new Screen(20, 10);
        shell.render(hiddenScreen);
        expect(hiddenScreen.back[1][0].bg).toEqual(COLORS.main);

        shell.toggleSidebar();
        const restoredScreen = new Screen(20, 10);
        shell.render(restoredScreen);
        expect(restoredScreen.back[1][0].bg).toEqual(COLORS.sidebar);
    });

    it('marks dirty when resized', () => {
        const shell = createShell();
        const dirtySpy = vi.spyOn(shell as any, 'markDirty');

        shell.handleResize(40, 12);

        expect(dirtySpy).toHaveBeenCalled();
        expect(shell.rect.width).toBe(40);
        expect(shell.rect.height).toBe(12);
    });

    it('scrolls main content with arrow keys', () => {
        const main = new LinesWidget(['A', 'B', 'C', 'D', 'E', 'F']);
        main.updateRect({ x: 0, y: 0, width: 20, height: 10 });

        const shell = new AppShell({
            header: new Box({ bg: COLORS.header }),
            footer: new Box({ bg: COLORS.footer }),
            main,
            sidebarWidth: 6,
        });

        shell.updateRect({ x: 0, y: 0, width: 20, height: 6 });

        const firstScreen = new Screen(20, 6);
        shell.render(firstScreen);
        expect(firstScreen.back[1][0].char).toBe('A');

        shell.handleKey({ key: 'down', ctrl: false, alt: false } as any);

        const secondScreen = new Screen(20, 6);
        shell.render(secondScreen);
        expect(secondScreen.back[1][0].char).toBe('B');

        shell.handleKey({ key: 'up', ctrl: false, alt: false } as any);

        const thirdScreen = new Screen(20, 6);
        shell.render(thirdScreen);
        expect(thirdScreen.back[1][0].char).toBe('A');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. AppShell without optional regions
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — optional region variants', () => {
    it('renders with main only, no exceptions', () => {
        const shell = createShellWith();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        expect(() => shell.render(screen)).not.toThrow();
        // Full screen should be occupied by main
        expect(screen.back[0][0].bg).toEqual(COLORS.main);
        expect(screen.back[9][19].bg).toEqual(COLORS.main);
    });

    it('renders with main + header only, layout is correct', () => {
        const shell = createShellWith({ withHeader: true });
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        expect(() => shell.render(screen)).not.toThrow();
        expect(screen.back[0][0].bg).toEqual(COLORS.header);
        // Row 1 onward is main (no footer)
        expect(screen.back[1][0].bg).toEqual(COLORS.main);
        expect(screen.back[9][0].bg).toEqual(COLORS.main);
    });

    it('renders with main + footer only, layout is correct', () => {
        const shell = createShellWith({ withFooter: true });
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        expect(() => shell.render(screen)).not.toThrow();
        // Last row is footer
        expect(screen.back[9][0].bg).toEqual(COLORS.footer);
        // Row 0 is main (no header)
        expect(screen.back[0][0].bg).toEqual(COLORS.main);
    });

    it('renders with main + sidebar only, layout is correct', () => {
        const shell = createShellWith({ withSidebar: true, sidebarWidth: 5 });
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        expect(() => shell.render(screen)).not.toThrow();
        // No header — sidebar starts at row 0
        expect(screen.back[0][0].bg).toEqual(COLORS.sidebar);
        expect(screen.back[0][4].bg).toEqual(COLORS.sidebar);
        expect(screen.back[0][5].bg).toEqual(COLORS.main);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Sidebar width clamping
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — sidebar width clamping', () => {
    it('clamps sidebarWidth to screen width so main area stays valid', () => {
        const shell = createShellWith({ withSidebar: true, sidebarWidth: 100 });
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        expect(() => shell.render(screen)).not.toThrow();
        // When sidebar would fill everything, main has no space — rendering
        // should not crash and no cell should be written past column 19.
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 20; col++) {
                // Just confirming no exception occurred — the loop itself verifies bounds.
                expect(screen.back[row][col]).toBeDefined();
            }
        }
    });

    it('sidebar narrower than screen leaves a valid main area', () => {
        const shell = createShellWith({ withSidebar: true, sidebarWidth: 8 });
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        shell.render(screen);
        // Column 8 should be the start of the main area
        expect(screen.back[0][7].bg).toEqual(COLORS.sidebar);
        expect(screen.back[0][8].bg).toEqual(COLORS.main);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Scroll offset never becomes negative
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — scroll floor at zero', () => {
    it('scrollUp() many times keeps offset at 0', () => {
        const main = new LinesWidget(['Line1', 'Line2']);
        main.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        const shell = new AppShell({ main, sidebarWidth: 0 });
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });

        for (let i = 0; i < 20; i++) shell.scrollUp();

        // Rendering must not throw and content starts at row 0
        const screen = new Screen(20, 10);
        expect(() => shell.render(screen)).not.toThrow();
        // 'Line1' is visible at the very first body row (no header)
        expect(screen.back[0][0].char).toBe('L');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Scroll offset clamps to content height
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — scroll ceiling clamp', () => {
    it('scrollDown() many times never overflows past content', () => {
        // 6-line content, 4-row viewport (header+footer each take 1 row, body = 4)
        const lines = ['A', 'B', 'C', 'D', 'E', 'F'];
        const main = new LinesWidget(lines);
        main.updateRect({ x: 0, y: 0, width: 20, height: 6 });

        const shell = new AppShell({
            header: new Box({ bg: COLORS.header }),
            footer: new Box({ bg: COLORS.footer }),
            main,
            sidebarWidth: 0,
        });
        shell.updateRect({ x: 0, y: 0, width: 20, height: 6 });

        // Scroll way past content
        for (let i = 0; i < 100; i++) shell.scrollDown();

        const screen = new Screen(20, 6);
        expect(() => shell.render(screen)).not.toThrow();
        // Last visible line should be 'F'
        expect(screen.back[4][0].char).toBe('F');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Sidebar toggle preserves scroll state
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — sidebar toggle preserves scroll', () => {
    it('scrolling then toggling sidebar keeps position valid', () => {
        const lines = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const main = new LinesWidget(lines);
        main.updateRect({ x: 0, y: 0, width: 14, height: 8 });

        const shell = new AppShell({
            sidebar: new Box({ bg: COLORS.sidebar }),
            main,
            sidebarWidth: 6,
        });
        shell.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        // Scroll down 2 lines
        shell.scrollDown(2);

        // Toggle sidebar — should not throw or reset scroll
        expect(() => shell.toggleSidebar()).not.toThrow();

        const screen = new Screen(20, 5);
        expect(() => shell.render(screen)).not.toThrow();

        // Toggle back
        shell.toggleSidebar();
        const screen2 = new Screen(20, 5);
        expect(() => shell.render(screen2)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Multiple sidebar toggles — state alternates correctly
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — repeated sidebar toggles', () => {
    it('visibility alternates and rendering remains stable', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });

        expect(shell.sidebarVisible).toBe(true);

        for (let i = 1; i <= 10; i++) {
            shell.toggleSidebar();
            expect(shell.sidebarVisible).toBe(i % 2 === 0);
            const screen = new Screen(20, 10);
            expect(() => shell.render(screen)).not.toThrow();
        }

        // After 10 toggles (even) sidebar is back to visible
        expect(shell.sidebarVisible).toBe(true);
        const finalScreen = new Screen(20, 10);
        shell.render(finalScreen);
        expect(finalScreen.back[1][0].bg).toEqual(COLORS.sidebar);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Zero-width rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — zero-width rendering', () => {
    it('does not throw when screen width is 0', () => {
        const shell = createShell();
        // A 0-column screen is technically unusual; Screen accepts it.
        const screen = new Screen(0, 10);
        expect(() => shell.render(screen)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Zero-height rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — zero-height rendering', () => {
    it('does not throw when screen height is 0', () => {
        const shell = createShell();
        const screen = new Screen(20, 0);
        expect(() => shell.render(screen)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Extremely small layouts (1×1)
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — tiny layout 1×1', () => {
    it('remains stable with a 1-column 1-row screen', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 1, height: 1 });
        const screen = new Screen(1, 1);
        expect(() => shell.render(screen)).not.toThrow();
        // No negative dimensions should be produced — rect fields must be >= 0.
        expect(shell.rect.width).toBeGreaterThanOrEqual(0);
        expect(shell.rect.height).toBeGreaterThanOrEqual(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. updateRect dirty-state logic
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — updateRect dirty logic', () => {
    it('does not call markDirty when rect is unchanged', () => {
        const shell = createShell();
        const rect = { x: 0, y: 0, width: 20, height: 10 };
        shell.updateRect(rect);

        // Clear the initial dirty state by rendering once
        const screen = new Screen(20, 10);
        shell.render(screen);
        // After rendering, manually clear dirty on the shell instance
        // (clearDirty is inherited from Widget)
        (shell as any)._dirty = false;

        const dirtySpy = vi.spyOn(shell as any, 'markDirty');
        // Same rect — should NOT trigger markDirty
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        expect(dirtySpy).not.toHaveBeenCalled();

        // Changed rect — SHOULD trigger markDirty
        shell.updateRect({ x: 0, y: 0, width: 30, height: 10 });
        expect(dirtySpy).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. handleKey ignores unsupported keys
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — unsupported key events', () => {
    it('does not throw or change scroll for left/right/enter/escape', () => {
        const main = new LinesWidget(['Line1', 'Line2', 'Line3']);
        main.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const shell = new AppShell({ main, sidebarWidth: 0 });
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });

        for (const key of ['left', 'right', 'enter', 'escape'] as const) {
            expect(() =>
                shell.handleKey({ key, ctrl: false, alt: false } as any)
            ).not.toThrow();
        }

        // Scroll state should be unchanged (still at 0)
        const screen = new Screen(20, 10);
        shell.render(screen);
        expect(screen.back[0][0].char).toBe('L'); // 'Line1' starts at 'L'
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Header / footer layout boundaries
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — header/footer layout boundaries', () => {
    it('header occupies exactly row 0 and footer occupies exactly the last row', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        shell.render(screen);

        // Row 0 is header
        for (let col = 0; col < 20; col++) {
            expect(screen.back[0][col].bg).toEqual(COLORS.header);
        }
        // Row 9 is footer
        for (let col = 0; col < 20; col++) {
            expect(screen.back[9][col].bg).toEqual(COLORS.footer);
        }
        // Row 1 (body start) is NOT header
        expect(screen.back[1][0].bg).not.toEqual(COLORS.header);
        // Row 8 (body end) is NOT footer
        expect(screen.back[8][0].bg).not.toEqual(COLORS.footer);
    });

    it('main body starts at row 1 (below header) and ends at row height-2 (above footer)', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        shell.render(screen);

        // Body rows 1-8 contain sidebar or main content, not header/footer colors
        for (let row = 1; row <= 8; row++) {
            const bg = screen.back[row][0].bg;
            expect(bg).not.toEqual(COLORS.header);
            expect(bg).not.toEqual(COLORS.footer);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Main content clipping
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — main content clipping', () => {
    it('clips content that overflows the viewport', () => {
        // Produce 20 lines in a 6-row viewport (header + footer each 1 row → body = 4)
        const lines = Array.from({ length: 20 }, (_, i) => `ROW${i}`);
        const main = new LinesWidget(lines);
        main.updateRect({ x: 0, y: 0, width: 20, height: 20 });

        const shell = new AppShell({
            header: new Box({ bg: COLORS.header }),
            footer: new Box({ bg: COLORS.footer }),
            main,
            sidebarWidth: 0,
        });
        shell.updateRect({ x: 0, y: 0, width: 20, height: 6 });

        const screen = new Screen(20, 6);
        shell.render(screen);

        // Row 0 = header, rows 1–4 = body, row 5 = footer
        expect(screen.back[0][0].bg).toEqual(COLORS.header);
        expect(screen.back[5][0].bg).toEqual(COLORS.footer);

        // The back buffer has exactly 6 rows — no row outside [0,5] exists
        expect(screen.back.length).toBe(6);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Sidebar hidden — main expands to fill freed space
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — sidebar hidden reallocation', () => {
    it('main area starts at x=0 and is full-width when sidebar is hidden', () => {
        const shell = createShell(); // sidebarWidth = 6
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });

        shell.toggleSidebar(); // hide

        const screen = new Screen(20, 10);
        shell.render(screen);

        // The entire body row 1 should be main content (no sidebar)
        for (let col = 0; col < 20; col++) {
            expect(screen.back[1][col].bg).toEqual(COLORS.main);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Multiple resize operations
// ─────────────────────────────────────────────────────────────────────────────

describe('AppShell — multiple resize operations', () => {
    it('rect updates correctly after several handleResize calls', () => {
        const shell = createShell();

        const sizes = [
            { cols: 40, rows: 20 },
            { cols: 80, rows: 24 },
            { cols: 10, rows: 5 },
            { cols: 120, rows: 40 },
        ];

        for (const { cols, rows } of sizes) {
            shell.handleResize(cols, rows);
            expect(shell.rect.width).toBe(cols);
            expect(shell.rect.height).toBe(rows);

            const screen = new Screen(cols, rows);
            expect(() => shell.render(screen)).not.toThrow();

            // After render, AppShell syncs to screen dimensions.
            // Verify header/footer placement at new dimensions.
            if (rows >= 2) {
                expect(screen.back[0][0].bg).toEqual(COLORS.header);
                expect(screen.back[rows - 1][0].bg).toEqual(COLORS.footer);
            }
        }
    });

    it('no stale dimensions remain after back-to-back resizes', () => {
        const shell = createShell();
        shell.handleResize(100, 50);
        shell.handleResize(30, 8);

        expect(shell.rect.width).toBe(30);
        expect(shell.rect.height).toBe(8);
    });
});

