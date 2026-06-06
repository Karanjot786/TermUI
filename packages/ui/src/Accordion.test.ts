// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Accordion widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Accordion } from './Accordion.js';

const makeAccordion = (multi = false) => new Accordion([
    { title: 'Section 1', body: 'Body 1' },
    { title: 'Section 2', body: 'Body 2\nMore 2' },
    { title: 'Section 3', body: 'Body 3' },
], {}, { multi });

describe('Accordion', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Original Tests ─────────────────────────────────

    it('all section titles render', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const accordion = makeAccordion();
        accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });

        const screen = new Screen(30, 10);
        accordion.render(screen);

        const rendered = screen.back.map(row => row.map(c => c.char).join('')).join('\n');

        expect(rendered).toContain('▶ Section 1');
        expect(rendered).toContain('▶ Section 2');
        expect(rendered).toContain('▶ Section 3');
    });

    it('enter opens the focused section', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const accordion = makeAccordion();
        accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });

        accordion.handleKey({ key: 'enter', ctrl: false, alt: false } as any);

        const screen = new Screen(30, 10);
        accordion.render(screen);

        const renderedLines = screen.back.map(row => row.map(c => c.char).join('').trim());

        expect(renderedLines[0]).toContain('▼ Section 1');
        expect(renderedLines[1]).toContain('Body 1');
        expect(renderedLines[2]).toContain('▶ Section 2');
    });

    it('opening section 2 closes section 1 in single mode', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const accordion = makeAccordion();
        accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });

        accordion.openSection(0);

        let screen = new Screen(30, 10);
        accordion.render(screen);
        let renderedLines = screen.back.map(row => row.map(c => c.char).join('').trim());
        expect(renderedLines[0]).toContain('▼ Section 1');
        expect(renderedLines[1]).toContain('Body 1');

        accordion.openSection(1);

        screen = new Screen(30, 10);
        accordion.render(screen);
        renderedLines = screen.back.map(row => row.map(c => c.char).join('').trim());

        expect(renderedLines[0]).toContain('▶ Section 1');
        expect(renderedLines[1]).toContain('▼ Section 2');
        expect(renderedLines[2]).toContain('Body 2');
        expect(renderedLines[3]).toContain('More 2');
    });

    it('multi mode allows two sections open', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const accordion = makeAccordion(true);
        accordion.updateRect({ x: 0, y: 0, width: 30, height: 15 });

        accordion.openSection(0);
        accordion.openSection(1);

        const screen = new Screen(30, 15);
        accordion.render(screen);
        const renderedLines = screen.back.map(row => row.map(c => c.char).join('').trim());

        expect(renderedLines[0]).toContain('▼ Section 1');
        expect(renderedLines[1]).toContain('Body 1');
        expect(renderedLines[2]).toContain('▼ Section 2');
        expect(renderedLines[3]).toContain('Body 2');
        expect(renderedLines[4]).toContain('More 2');
        expect(renderedLines[5]).toContain('▶ Section 3');
    });

    it('up/down move focus', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const accordion = makeAccordion();

        accordion.handleKey({ key: 'down', ctrl: false, alt: false } as any);
        expect((accordion as any)._focusIndex).toBe(1);

        accordion.handleKey({ key: 'down', ctrl: false, alt: false } as any);
        expect((accordion as any)._focusIndex).toBe(2);

        accordion.handleKey({ key: 'down', ctrl: false, alt: false } as any);
        expect((accordion as any)._focusIndex).toBe(2);

        accordion.handleKey({ key: 'up', ctrl: false, alt: false } as any);
        expect((accordion as any)._focusIndex).toBe(1);
    });

    // ── 1. Empty Accordion ─────────────────────────────

    describe('empty accordion', () => {
        it('renders without throwing', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = new Accordion([], {});
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });
            const screen = new Screen(30, 10);

            expect(() => accordion.render(screen)).not.toThrow();
        });

        it('renders no content when empty', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = new Accordion([], {});
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });
            const screen = new Screen(30, 10);
            accordion.render(screen);

            const rendered = screen.back.map(row => row.map(c => c.char).join('').trim()).join('');
            expect(rendered).toBe('');
        });

        it('handleKey does not throw on empty accordion', () => {
            const accordion = new Accordion([], {});
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });

            expect(() => accordion.handleKey({ key: 'enter', ctrl: false, alt: false } as any)).not.toThrow();
            expect(() => accordion.handleKey({ key: 'space', ctrl: false, alt: false } as any)).not.toThrow();
            expect(() => accordion.handleKey({ key: 'up',    ctrl: false, alt: false } as any)).not.toThrow();
            expect(() => accordion.handleKey({ key: 'down',  ctrl: false, alt: false } as any)).not.toThrow();
        });

        it('focus state stays at 0 on empty accordion after key presses', () => {
            const accordion = new Accordion([], {});
            accordion.handleKey({ key: 'down', ctrl: false, alt: false } as any);
            expect((accordion as any)._focusIndex).toBe(0);
        });
    });

    // ── 2. Invalid Section Indexes ─────────────────────

    describe('invalid section indexes', () => {
        it('openSection(-1) does not throw', () => {
            const accordion = makeAccordion();
            expect(() => accordion.openSection(-1)).not.toThrow();
        });

        it('openSection(999) does not throw', () => {
            const accordion = makeAccordion();
            expect(() => accordion.openSection(999)).not.toThrow();
        });

        it('closeSection(-1) does not throw', () => {
            const accordion = makeAccordion();
            expect(() => accordion.closeSection(-1)).not.toThrow();
        });

        it('closeSection(999) does not throw', () => {
            const accordion = makeAccordion();
            expect(() => accordion.closeSection(999)).not.toThrow();
        });

        it('openSection(-1) leaves _openSet unchanged', () => {
            const accordion = makeAccordion();
            accordion.openSection(0);
            accordion.openSection(-1);
            expect((accordion as any)._openSet.has(0)).toBe(true);
            expect((accordion as any)._openSet.size).toBe(1);
        });

        it('openSection(999) does not fire onToggle', () => {
            const onToggle = vi.fn();
            const accordion = new Accordion(
                [{ title: 'S1', body: 'B1' }],
                {},
                { onToggle }
            );
            accordion.openSection(999);
            expect(onToggle).not.toHaveBeenCalled();
        });

        it('closeSection(-1) does not fire onToggle', () => {
            const onToggle = vi.fn();
            const accordion = new Accordion(
                [{ title: 'S1', body: 'B1' }],
                {},
                { onToggle }
            );
            accordion.openSection(0);
            onToggle.mockClear();
            accordion.closeSection(-1);
            expect(onToggle).not.toHaveBeenCalled();
        });
    });

    // ── 3. Enter Toggles Open and Closed ──────────────

    describe('Enter toggles section open then closed', () => {
        it('Enter on a closed section opens it', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion();
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });

            accordion.handleKey({ key: 'enter', ctrl: false, alt: false } as any);

            const screen = new Screen(30, 10);
            accordion.render(screen);
            const lines = screen.back.map(row => row.map(c => c.char).join('').trim());

            expect(lines[0]).toContain('▼ Section 1');
            expect(lines[1]).toContain('Body 1');
        });

        it('Enter on an open section closes it and hides body', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion();
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });

            // Open, then close via Enter
            accordion.handleKey({ key: 'enter', ctrl: false, alt: false } as any);
            accordion.handleKey({ key: 'enter', ctrl: false, alt: false } as any);

            const screen = new Screen(30, 10);
            accordion.render(screen);
            const lines = screen.back.map(row => row.map(c => c.char).join('').trim());

            expect(lines[0]).toContain('▶ Section 1');
            expect(lines[1]).not.toContain('Body 1');
        });

        it('Enter close fires onToggle with (index, false)', () => {
            const onToggle = vi.fn();
            const accordion = new Accordion(
                [{ title: 'S1', body: 'B1' }, { title: 'S2', body: 'B2' }],
                {},
                { onToggle }
            );
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });

            accordion.handleKey({ key: 'enter', ctrl: false, alt: false } as any); // open
            onToggle.mockClear();
            accordion.handleKey({ key: 'enter', ctrl: false, alt: false } as any); // close

            expect(onToggle).toHaveBeenCalledWith(0, false);
        });
    });

    // ── 4. Space Key Behavior ──────────────────────────

    describe('Space key toggles sections', () => {
        it('Space opens the focused section', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion();
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });

            accordion.handleKey({ key: 'space', ctrl: false, alt: false } as any);

            const screen = new Screen(30, 10);
            accordion.render(screen);
            const lines = screen.back.map(row => row.map(c => c.char).join('').trim());

            expect(lines[0]).toContain('▼ Section 1');
            expect(lines[1]).toContain('Body 1');
        });

        it('Space closes an already-open section', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion();
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });

            accordion.handleKey({ key: 'space', ctrl: false, alt: false } as any); // open
            accordion.handleKey({ key: 'space', ctrl: false, alt: false } as any); // close

            const screen = new Screen(30, 10);
            accordion.render(screen);
            const lines = screen.back.map(row => row.map(c => c.char).join('').trim());

            expect(lines[0]).toContain('▶ Section 1');
            expect(lines[1]).not.toContain('Body 1');
        });

        it('Space and Enter produce identical open state', () => {
            const a1 = makeAccordion();
            const a2 = makeAccordion();

            a1.handleKey({ key: 'enter', ctrl: false, alt: false } as any);
            a2.handleKey({ key: 'space', ctrl: false, alt: false } as any);

            expect((a1 as any)._openSet.has(0)).toBe(true);
            expect((a2 as any)._openSet.has(0)).toBe(true);
        });
    });

    // ── 5. onToggle Callback Behavior ─────────────────

    describe('onToggle callback', () => {
        it('fires with (index, true) when opening a section', () => {
            const onToggle = vi.fn();
            const accordion = new Accordion(
                [{ title: 'S1', body: 'B1' }, { title: 'S2', body: 'B2' }],
                {},
                { onToggle }
            );

            accordion.openSection(0);

            expect(onToggle).toHaveBeenCalledOnce();
            expect(onToggle).toHaveBeenCalledWith(0, true);
        });

        it('fires with (index, false) when closing a section', () => {
            const onToggle = vi.fn();
            const accordion = new Accordion(
                [{ title: 'S1', body: 'B1' }, { title: 'S2', body: 'B2' }],
                {},
                { onToggle }
            );

            accordion.openSection(0);
            onToggle.mockClear();
            accordion.closeSection(0);

            expect(onToggle).toHaveBeenCalledOnce();
            expect(onToggle).toHaveBeenCalledWith(0, false);
        });

        it('single mode fires close event for previous section then open for new', () => {
            const onToggle = vi.fn();
            const accordion = new Accordion(
                [{ title: 'S1', body: 'B1' }, { title: 'S2', body: 'B2' }],
                {},
                { onToggle }
            );

            accordion.openSection(0); // fires (0, true)
            onToggle.mockClear();
            accordion.openSection(1); // fires (0, false) then (1, true)

            expect(onToggle).toHaveBeenCalledTimes(2);
            expect(onToggle).toHaveBeenNthCalledWith(1, 0, false);
            expect(onToggle).toHaveBeenNthCalledWith(2, 1, true);
        });
    });

    // ── 6. setItems() Removes Invalid Open Sections ────

    describe('setItems() prunes stale open indexes', () => {
        it('removes open index that is out of range after setItems', () => {
            const accordion = makeAccordion();
            accordion.openSection(2);
            expect((accordion as any)._openSet.has(2)).toBe(true);

            accordion.setItems([
                { title: 'A', body: 'Body A' },
                { title: 'B', body: 'Body B' },
            ]);

            expect((accordion as any)._openSet.has(2)).toBe(false);
            expect((accordion as any)._openSet.size).toBe(0);
        });

        it('renders correctly after stale sections are pruned', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion();
            accordion.openSection(2);

            accordion.setItems([
                { title: 'A', body: 'Body A' },
                { title: 'B', body: 'Body B' },
            ]);

            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });
            const screen = new Screen(30, 10);
            expect(() => accordion.render(screen)).not.toThrow();

            const lines = screen.back.map(row => row.map(c => c.char).join('').trim());
            expect(lines[0]).toContain('▶ A');
            expect(lines[1]).toContain('▶ B');
        });
    });

    // ── 7. setItems() Clamps Focus Index ──────────────

    describe('setItems() clamps focus index', () => {
        it('clamps focusIndex to last valid item when list shrinks', () => {
            const accordion = makeAccordion();
            // Move focus to index 2 (last item)
            accordion.handleKey({ key: 'down', ctrl: false, alt: false } as any);
            accordion.handleKey({ key: 'down', ctrl: false, alt: false } as any);
            expect((accordion as any)._focusIndex).toBe(2);

            accordion.setItems([{ title: 'A', body: 'Body A' }]);

            expect((accordion as any)._focusIndex).toBe(0);
        });

        it('render does not throw after focus is clamped by setItems', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion();
            accordion.handleKey({ key: 'down', ctrl: false, alt: false } as any);
            accordion.handleKey({ key: 'down', ctrl: false, alt: false } as any);

            accordion.setItems([{ title: 'Only', body: 'Body' }]);
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 5 });

            const screen = new Screen(30, 5);
            expect(() => accordion.render(screen)).not.toThrow();
        });
    });

    // ── 8. Multi-Mode Close Behavior ──────────────────

    describe('multi-mode close keeps other sections open', () => {
        it('closing one section leaves remaining open sections intact', () => {
            const accordion = makeAccordion(true);

            accordion.openSection(0);
            accordion.openSection(1);
            accordion.openSection(2);

            accordion.closeSection(1);

            expect((accordion as any)._openSet.has(0)).toBe(true);
            expect((accordion as any)._openSet.has(1)).toBe(false);
            expect((accordion as any)._openSet.has(2)).toBe(true);
        });

        it('render reflects partial close correctly in multi-mode', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion(true);
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 15 });

            accordion.openSection(0);
            accordion.openSection(2);
            accordion.closeSection(0);

            const screen = new Screen(30, 15);
            accordion.render(screen);
            const lines = screen.back.map(row => row.map(c => c.char).join('').trim());

            // Section 1 closed, Section 2 was never opened, Section 3 open
            expect(lines[0]).toContain('▶ Section 1');
            expect(lines[1]).toContain('▶ Section 2');
            expect(lines[2]).toContain('▼ Section 3');
            expect(lines[3]).toContain('Body 3');
        });
    });

    // ── 9. Non-Unicode Rendering ───────────────────────

    describe('non-unicode rendering', () => {
        it('renders closed sections with ASCII > indicator', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

            const accordion = makeAccordion();
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });

            const screen = new Screen(30, 10);
            accordion.render(screen);
            const rendered = screen.back.map(row => row.map(c => c.char).join('')).join('\n');

            expect(rendered).toContain('> Section 1');
            expect(rendered).toContain('> Section 2');
        });

        it('renders open sections with ASCII v indicator', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

            const accordion = makeAccordion();
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });
            accordion.openSection(0);

            const screen = new Screen(30, 10);
            accordion.render(screen);
            const rendered = screen.back.map(row => row.map(c => c.char).join('')).join('\n');

            expect(rendered).toContain('v Section 1');
        });

        it('does not render unicode arrows when unicode is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

            const accordion = makeAccordion();
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 10 });

            const screen = new Screen(30, 10);
            accordion.render(screen);
            const rendered = screen.back.map(row => row.map(c => c.char).join('')).join('\n');

            expect(rendered).not.toContain('▶');
            expect(rendered).not.toContain('▼');
        });
    });

    // ── 10. Height Clipping ────────────────────────────

    describe('height clipping', () => {
        it('does not throw when content exceeds available height', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion(true);
            accordion.openSection(0);
            accordion.openSection(1);
            accordion.openSection(2);

            // Only 3 rows — far less than total content
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 3 });
            const screen = new Screen(30, 3);

            expect(() => accordion.render(screen)).not.toThrow();
        });

        it('content written beyond height boundary stays empty on screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion(true);
            accordion.openSection(0);
            accordion.openSection(1);
            accordion.openSection(2);

            // Render into a 2-row logical content area on a 10-row screen
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 2 });
            const screen = new Screen(30, 10);
            accordion.render(screen);

            // Rows 2–9 must be completely empty (widget must not have written past height)
            const overflowRows = screen.back.slice(2).filter(
                row => row.map(c => c.char).join('').trim().length > 0
            );
            expect(overflowRows.length).toBe(0);
        });
    });

    // ── 11. Width Clipping ─────────────────────────────

    describe('width clipping', () => {
        it('does not throw with a very small width', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = new Accordion(
                [{ title: 'A very long section title that exceeds narrow width', body: 'Body' }],
                {}
            );
            accordion.updateRect({ x: 0, y: 0, width: 5, height: 10 });
            const screen = new Screen(5, 10);

            expect(() => accordion.render(screen)).not.toThrow();
        });

        it('each rendered row has exactly width chars (title is truncated to fit)', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = new Accordion(
                [{ title: 'A very long section title', body: 'Body' }],
                {}
            );
            accordion.updateRect({ x: 0, y: 0, width: 8, height: 5 });
            const screen = new Screen(8, 5);
            accordion.render(screen);

            const row0 = screen.back[0]!.map(c => c.char).join('');
            expect(row0.length).toBe(8);
        });

        it('renders stably with a width of 1', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = new Accordion(
                [{ title: 'T', body: 'B' }],
                {}
            );
            accordion.updateRect({ x: 0, y: 0, width: 1, height: 5 });
            const screen = new Screen(1, 5);

            expect(() => accordion.render(screen)).not.toThrow();
        });
    });

    // ── 12. Single-Mode Reopening Behavior ────────────

    describe('single-mode ensures only one section open at a time', () => {
        it('opening section 0 after section 1 closes section 1', () => {
            const accordion = makeAccordion();

            accordion.openSection(0);
            accordion.openSection(1);
            accordion.openSection(0); // reopen 0

            expect((accordion as any)._openSet.has(0)).toBe(true);
            expect((accordion as any)._openSet.has(1)).toBe(false);
            expect((accordion as any)._openSet.size).toBe(1);
        });

        it('render after single-mode re-open shows only the newly focused section open', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion();
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 15 });

            accordion.openSection(1);
            accordion.openSection(2);
            accordion.openSection(0); // should close 2, open 0

            const screen = new Screen(30, 15);
            accordion.render(screen);
            const lines = screen.back.map(row => row.map(c => c.char).join('').trim());

            expect(lines[0]).toContain('▼ Section 1');
            expect(lines[1]).toContain('Body 1');
            expect(lines[2]).toContain('▶ Section 2');
            expect(lines[3]).toContain('▶ Section 3');
        });
    });

    // ── 13. Repeated Open Calls ────────────────────────

    describe('repeated openSection calls', () => {
        it('calling openSection(0) twice does not duplicate _openSet entry', () => {
            const accordion = makeAccordion();
            accordion.openSection(0);
            accordion.openSection(0);

            expect((accordion as any)._openSet.size).toBe(1);
            expect((accordion as any)._openSet.has(0)).toBe(true);
        });

        it('calling openSection(0) twice fires onToggle only once', () => {
            const onToggle = vi.fn();
            const accordion = new Accordion(
                [{ title: 'S1', body: 'B1' }],
                {},
                { onToggle }
            );

            accordion.openSection(0);
            accordion.openSection(0);

            expect(onToggle).toHaveBeenCalledOnce();
            expect(onToggle).toHaveBeenCalledWith(0, true);
        });
    });

    // ── 14. Repeated Close Calls ───────────────────────

    describe('repeated closeSection calls', () => {
        it('calling closeSection(0) twice does not throw', () => {
            const accordion = makeAccordion();
            accordion.openSection(0);

            expect(() => {
                accordion.closeSection(0);
                accordion.closeSection(0);
            }).not.toThrow();
        });

        it('calling closeSection(0) twice fires onToggle only once', () => {
            const onToggle = vi.fn();
            const accordion = new Accordion(
                [{ title: 'S1', body: 'B1' }],
                {},
                { onToggle }
            );

            accordion.openSection(0);
            onToggle.mockClear();

            accordion.closeSection(0);
            accordion.closeSection(0); // already closed — no-op

            expect(onToggle).toHaveBeenCalledOnce();
            expect(onToggle).toHaveBeenCalledWith(0, false);
        });

        it('_openSet remains empty after double close', () => {
            const accordion = makeAccordion();
            accordion.openSection(0);
            accordion.closeSection(0);
            accordion.closeSection(0);

            expect((accordion as any)._openSet.has(0)).toBe(false);
            expect((accordion as any)._openSet.size).toBe(0);
        });
    });
});
