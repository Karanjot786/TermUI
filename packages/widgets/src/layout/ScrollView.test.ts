// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for ScrollView widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { ScrollView } from './ScrollView.js';
import { Screen, type KeyEvent } from '@termuijs/core';

const key = (k: string): KeyEvent => ({
    key: k,
    raw: Buffer.alloc(0),
    ctrl: false,
    alt: false,
    shift: false,
    stopPropagation: () => {},
    preventDefault: () => {},
});

const spyKey = (k: string): KeyEvent => ({
    ...key(k),
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
});

afterEach(() => {
    vi.restoreAllMocks();
});
describe("ScrollView", () => {
    it("renders without error when content is taller than viewport", () => {
        const sv = new ScrollView(
            { width: 10, height: 5 },
            { contentHeight: 20 },
        );
        const screen = new Screen(10, 5);
        sv.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        expect(() => sv.render(screen)).not.toThrow();
    });

    it("scrollBy with positive delta increments scrollOffset", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(1);
        expect(sv.scrollOffset).toBe(1);
    });

    it("scrollBy with negative delta decrements scrollOffset", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(5);
        sv.scrollBy(-1);
        expect(sv.scrollOffset).toBe(4);
    });

    it("scrollBy floors offset at 0", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(-5);
        expect(sv.scrollOffset).toBe(0);
    });

    it("scrollBy pages down by viewport height", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(4);
        expect(sv.scrollOffset).toBe(4);
    });

    it("scrollBy pages up decrements offset and floors at 0", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(10);
        expect(sv.scrollOffset).toBe(10);
        sv.scrollBy(-4);
        expect(sv.scrollOffset).toBe(6);
        sv.scrollBy(-20);
        expect(sv.scrollOffset).toBe(0);
    });

    it("clamps offset so it does not exceed contentHeight - viewHeight", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 10 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(20);
        expect(sv.scrollOffset).toBe(5);
    });

    it("scrollTo sets exact offset clamped to valid range", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 10 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollTo(3);
        expect(sv.scrollOffset).toBe(3);
        sv.scrollTo(-5);
        expect(sv.scrollOffset).toBe(0);
        sv.scrollTo(100);
        expect(sv.scrollOffset).toBe(5);
    });

    it("setContentHeight clamps offset when content shrinks", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(15);
        expect(sv.scrollOffset).toBe(15);
        sv.setContentHeight(10);
        expect(sv.scrollOffset).toBe(5);
    });

    it("clamps offset when viewport height grows", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollTo(15);
        sv.clearDirty();

        sv.updateRect({ x: 0, y: 0, width: 40, height: 10 });

        expect(sv.scrollOffset).toBe(10);
        expect(sv.isDirty).toBe(true);
    });

    it("clamps stale offsets before rendering", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        const screen = new Screen(40, 10);

        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollTo(15);
        sv.setContentHeight(12);
        sv.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        (sv as any)._scrollOffset = 15;
        sv.render(screen);

        expect(sv.scrollOffset).toBe(2);
    });

    it("initial scrollOffset is 0", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        expect(sv.scrollOffset).toBe(0);
    });

    it("renders scrollbar when content exceeds viewport", () => {
        const sv = new ScrollView(
            { width: 12, height: 5, border: "single" },
            { contentHeight: 20 },
        );
        const screen = new Screen(12, 5);
        sv.updateRect({ x: 0, y: 0, width: 12, height: 5 });
        sv.render(screen);
        // Scrollbar track is drawn at the right edge of the content rect
        // Row 3 (y=1 + i=2) is track (not thumb) when scrollOffset=0
        expect(screen.back[3][11].char).toBe("\u2591");
    });

    it("renders without scrollbar when showScrollbar is false", () => {
        const sv = new ScrollView(
            { width: 10, height: 5 },
            { contentHeight: 20, showScrollbar: false },
        );
        const screen = new Screen(10, 5);
        sv.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        sv.render(screen);
        expect(screen.back[0][9].char).toBe(" ");
    });

    it("does not render scrollbar when content fits viewport", () => {
        const sv = new ScrollView(
            { width: 10, height: 5 },
            { contentHeight: 3 },
        );
        const screen = new Screen(10, 5);
        sv.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        sv.render(screen);
        expect(screen.back[0][9].char).toBe(" ");
    });

    it("down scrolls down by 1", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.handleKey(key("down"));
        expect(sv.scrollOffset).toBe(1);
    });

    it("consumes handled navigation keys", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        const event = spyKey("down");
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });

        sv.handleKey(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
    });

    it("does not consume unhandled keys", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        const event = spyKey("x");
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });

        sv.handleKey(event);

        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(event.stopPropagation).not.toHaveBeenCalled();
    });

    it("up scrolls up by 1", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(5);
        sv.handleKey(key("up"));
        expect(sv.scrollOffset).toBe(4);
    });

    it("pagedown scrolls down by viewport height - 1", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.handleKey(key("pagedown"));
        expect(sv.scrollOffset).toBe(4);
    });

    it("pageup scrolls up by viewport height - 1", () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(10);
        sv.handleKey(key("pageup"));
        expect(sv.scrollOffset).toBe(6);
    });

    it("uses acceleration when enabled", () => {
        const sv = new ScrollView(
            { height: 5 },
            {
                contentHeight: 100,
                scrollAccel: true,
            },
        );

        sv.updateRect({
            x: 0,
            y: 0,
            width: 40,
            height: 5,
        });

        let t = 0;

        vi.spyOn(Date, "now").mockImplementation(() => {
            t += 10;
            return t;
        });

        sv.handleKey(key("down"));
        sv.handleKey(key("down"));

        expect(sv.scrollOffset).toBeGreaterThan(1);
    });
    
    it('does not mark dirty when content height is unchanged', () => {
        const view = new ScrollView({}, { contentHeight: 10 });
    
        view.clearDirty();
        view.setContentHeight(10);
    
        expect(view.isDirty).toBe(false);
    });

    it('scrollTo same offset does not mark dirty', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollTo(3);
        sv.clearDirty();

        sv.scrollTo(3);

        expect(sv.isDirty).toBe(false);
    });

    it('scrollTo different offset marks dirty', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollTo(2);
        sv.clearDirty();

        sv.scrollTo(4);

        expect(sv.isDirty).toBe(true);
    });

    it('setContentHeight below current offset clamps offset and marks dirty', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollTo(10);
        sv.clearDirty();

        sv.setContentHeight(8);

        expect(sv.scrollOffset).toBeLessThanOrEqual(3); // maxOffset = 8 - 5 = 3
        expect(sv.isDirty).toBe(true);
    });

    it('scrollbar cells appear when contentHeight exceeds viewport height', () => {
        // Use width=12 and border='single' so content rect is 10 wide.
        // scrollX = contentRect.x(1) + contentRect.width(10) = 11, inside the 12-col screen.
        const sv = new ScrollView(
            { width: 12, height: 5, border: 'single' },
            { contentHeight: 20, showScrollbar: true },
        );
        const screen = new Screen(12, 5);
        sv.updateRect({ x: 0, y: 0, width: 12, height: 5 });
        sv.render(screen);

        // Scrollbar occupies col 11 (right edge of content rect)
        const rightCol = screen.back.map((row) => row[11].char);
        const hasScrollbar = rightCol.some((ch) => ch !== ' ');
        expect(hasScrollbar).toBe(true);
    });

    it('scrollbar not rendered when contentHeight does not exceed viewport height', () => {
        const sv = new ScrollView(
            { width: 10, height: 5 },
            { contentHeight: 3, showScrollbar: true },
        );
        const screen = new Screen(10, 5);
        sv.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        sv.render(screen);

        const rightCol = screen.back.map((row) => row[9].char);
        const hasScrollbar = rightCol.some((ch) => ch !== ' ');
        expect(hasScrollbar).toBe(false);
    });



    describe('keybindingMode integration', () => {
        const originalKeybindings = process.env.TERMUI_KEYBINDINGS;

        afterEach(() => {
            vi.restoreAllMocks();
            if (originalKeybindings === undefined) {
                delete process.env.TERMUI_KEYBINDINGS;
            } else {
                process.env.TERMUI_KEYBINDINGS = originalKeybindings;
            }
        });

        it('down scrolls down by 1 in vim mode using j', () => {
            process.env.TERMUI_KEYBINDINGS = 'vim';
            const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
            sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
            sv.handleKey(key('j'));
            expect(sv.scrollOffset).toBe(1);
        });

        it('up scrolls up by 1 in emacs mode using ctrl+p', () => {
            process.env.TERMUI_KEYBINDINGS = 'emacs';
            const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
            sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
            sv.scrollBy(5);
            sv.handleKey(key('ctrl+p'));
            expect(sv.scrollOffset).toBe(4);
        });

        it('j does not scroll down in default mode', () => {
            delete process.env.TERMUI_KEYBINDINGS;
            const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
            sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
            sv.handleKey(key('j'));
            expect(sv.scrollOffset).toBe(0);
        });
    });
});
