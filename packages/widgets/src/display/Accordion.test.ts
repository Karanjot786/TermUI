// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Accordion widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import type { KeyEvent } from '@termuijs/core';
import { Accordion, type AccordionSection } from './Accordion.js';

// ── Helpers ───────────────────────────────────────────

const SECTIONS: AccordionSection[] = [
    { title: 'System Info', content: 'CPU: 45%\nRAM: 2.1 GB' },
    { title: 'Network',     content: 'eth0: 192.168.1.1' },
    { title: 'Processes',   content: 'nginx\nnode\nbun' },
];

function makeKeyEvent(key: string): KeyEvent {
    return { key, ctrl: false, alt: false, shift: false } as KeyEvent;
}

function makeAccordion(
    sections: AccordionSection[] = SECTIONS,
    opts: ConstructorParameters<typeof Accordion>[2] = {},
    width = 40,
    height = 20,
) {
    const accordion = new Accordion(sections, {}, opts);
    accordion.updateRect({ x: 0, y: 0, width, height });
    return accordion;
}

function renderAccordion(
    accordion: Accordion,
    width = 40,
    height = 20,
): Screen {
    const screen = new Screen(width, height);
    accordion.updateRect({ x: 0, y: 0, width, height });
    accordion.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

function allText(screen: Screen, rows = 20): string {
    return Array.from({ length: rows }, (_, i) => rowText(screen, i)).join('\n');
}

// ── Tests ─────────────────────────────────────────────

describe('Accordion', () => {

    describe('1. Initial render', () => {
        it('renders all section titles', () => {
            const accordion = makeAccordion();
            const screen = renderAccordion(accordion);
            const text = allText(screen);
            expect(text).toContain('System Info');
            expect(text).toContain('Network');
            expect(text).toContain('Processes');
        });

        it('opens section 0 by default', () => {
            const accordion = makeAccordion();
            expect(accordion.isOpen(0)).toBe(true);
            expect(accordion.isOpen(1)).toBe(false);
            expect(accordion.isOpen(2)).toBe(false);
        });

        it('shows content of open section in render', () => {
            const accordion = makeAccordion();
            const screen = renderAccordion(accordion);
            const text = allText(screen);
            expect(text).toContain('CPU: 45%');
            expect(text).toContain('RAM: 2.1 GB');
        });

        it('does not show content of closed sections', () => {
            const accordion = makeAccordion();
            const screen = renderAccordion(accordion);
            const text = allText(screen);
            expect(text).not.toContain('eth0');
            expect(text).not.toContain('nginx');
        });

        it('respects openIndex option', () => {
            const accordion = makeAccordion(SECTIONS, { openIndex: 1 });
            expect(accordion.isOpen(0)).toBe(false);
            expect(accordion.isOpen(1)).toBe(true);
        });
    });

    describe('2. open / close / toggle', () => {
        it('open() opens a closed section', () => {
            const accordion = makeAccordion();
            accordion.open(1);
            expect(accordion.isOpen(1)).toBe(true);
        });

        it('open() closes previously open section in single mode', () => {
            const accordion = makeAccordion();
            accordion.open(1);
            expect(accordion.isOpen(0)).toBe(false);
            expect(accordion.isOpen(1)).toBe(true);
        });

        it('open() ignores out-of-bounds index', () => {
            const accordion = makeAccordion();
            expect(() => accordion.open(99)).not.toThrow();
        });

        it('close() closes an open section', () => {
            const accordion = makeAccordion();
            accordion.close(0);
            expect(accordion.isOpen(0)).toBe(false);
        });

        it('toggle() opens a closed section', () => {
            const accordion = makeAccordion();
            accordion.toggle(1);
            expect(accordion.isOpen(1)).toBe(true);
        });

        it('toggle() closes an open section', () => {
            const accordion = makeAccordion();
            accordion.toggle(0);
            expect(accordion.isOpen(0)).toBe(false);
        });

        it('open() calls markDirty', () => {
            const accordion = makeAccordion();
            const spy = vi.spyOn(accordion, 'markDirty');
            accordion.open(1);
            expect(spy).toHaveBeenCalled();
        });

        it('close() calls markDirty', () => {
            const accordion = makeAccordion();
            const spy = vi.spyOn(accordion, 'markDirty');
            accordion.close(0);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('3. multiple mode', () => {
        it('allows multiple sections open at once', () => {
            const accordion = makeAccordion(SECTIONS, { multiple: true, openIndex: 0 });
            accordion.open(1);
            accordion.open(2);
            expect(accordion.isOpen(0)).toBe(true);
            expect(accordion.isOpen(1)).toBe(true);
            expect(accordion.isOpen(2)).toBe(true);
        });

        it('single mode closes others when opening new section', () => {
            const accordion = makeAccordion(SECTIONS, { multiple: false });
            accordion.open(2);
            expect(accordion.isOpen(0)).toBe(false);
            expect(accordion.isOpen(2)).toBe(true);
        });
    });

    describe('4. onToggle callback', () => {
        it('fires onToggle when section is opened', () => {
            const onToggle = vi.fn();
            const accordion = makeAccordion(SECTIONS, { onToggle });
            accordion.open(1);
            expect(onToggle).toHaveBeenCalledWith(1, true);
        });

        it('fires onToggle when section is closed', () => {
            const onToggle = vi.fn();
            const accordion = makeAccordion(SECTIONS, { onToggle });
            accordion.close(0);
            expect(onToggle).toHaveBeenCalledWith(0, false);
        });

        it('fires onToggle for implicitly closed section in single mode', () => {
            const onToggle = vi.fn();
            const accordion = makeAccordion(SECTIONS, { onToggle });
            // section 0 is open by default; opening section 1 should close section 0
            accordion.open(1);
            expect(onToggle).toHaveBeenCalledWith(0, false);
            expect(onToggle).toHaveBeenCalledWith(1, true);
        });
    });

    describe('5. Keyboard navigation', () => {
        it('enter key toggles focused section', () => {
            const accordion = makeAccordion();
            expect(accordion.isOpen(0)).toBe(true);
            accordion.handleKey(makeKeyEvent('enter'));
            expect(accordion.isOpen(0)).toBe(false);
        });

        it('space key toggles focused section', () => {
            const accordion = makeAccordion();
            accordion.handleKey(makeKeyEvent('space'));
            expect(accordion.isOpen(0)).toBe(false);
        });

        it('down key moves focus to next section', () => {
            const accordion = makeAccordion();
            expect(accordion.getFocusedIndex()).toBe(0);
            accordion.handleKey(makeKeyEvent('down'));
            expect(accordion.getFocusedIndex()).toBe(1);
        });

        it('up key moves focus to previous section', () => {
            const accordion = makeAccordion();
            accordion.handleKey(makeKeyEvent('down'));
            accordion.handleKey(makeKeyEvent('up'));
            expect(accordion.getFocusedIndex()).toBe(0);
        });

        it('up key does not go below 0', () => {
            const accordion = makeAccordion();
            accordion.handleKey(makeKeyEvent('up'));
            expect(accordion.getFocusedIndex()).toBe(0);
        });

        it('down key does not exceed last index', () => {
            const accordion = makeAccordion();
            accordion.handleKey(makeKeyEvent('down'));
            accordion.handleKey(makeKeyEvent('down'));
            accordion.handleKey(makeKeyEvent('down'));
            expect(accordion.getFocusedIndex()).toBe(2);
        });

        it('other keys are ignored', () => {
            const accordion = makeAccordion();
            const before = accordion.getFocusedIndex();
            accordion.handleKey(makeKeyEvent('a'));
            expect(accordion.getFocusedIndex()).toBe(before);
        });
    });

    describe('6. Unicode / ASCII fallback', () => {
        it('uses unicode chars when caps.unicode is true', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const accordion = makeAccordion();
            const screen = renderAccordion(accordion);
            const row0 = rowText(screen, 0);
            expect(row0).toMatch(/[▼▶]/);
            vi.restoreAllMocks();
        });

        it('uses ASCII chars when caps.unicode is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const accordion = makeAccordion();
            const screen = renderAccordion(accordion);
            const row0 = rowText(screen, 0);
            expect(row0).toMatch(/[v>]/);
            vi.restoreAllMocks();
        });
    });

    describe('7. Height updates', () => {
        it('increases height when a section is opened', () => {
            const accordion = makeAccordion(SECTIONS, { openIndex: -1 });
            // _style.height is set dynamically by _updateHeight(); cast needed for numeric comparison
            const before = accordion['_style'].height as number;
            accordion.open(0);
            expect(accordion['_style'].height).toBeGreaterThan(before);
        });

        it('decreases height when a section is closed', () => {
            const accordion = makeAccordion();
            // _style.height is set dynamically by _updateHeight(); cast needed for numeric comparison
            const before = accordion['_style'].height as number;
            accordion.close(0);
            expect(accordion['_style'].height).toBeLessThan(before);
        });
    });

    describe('8. setSections', () => {
        it('replaces sections and resets state', () => {
            const accordion = makeAccordion();
            accordion.setSections([{ title: 'New', content: 'content' }]);
            expect(accordion.isOpen(0)).toBe(true);
            expect(accordion.getFocusedIndex()).toBe(0);
        });

        it('calls markDirty', () => {
            const accordion = makeAccordion();
            const spy = vi.spyOn(accordion, 'markDirty');
            accordion.setSections([{ title: 'X', content: 'y' }]);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('9. Edge cases', () => {
        it('handles empty sections array without error', () => {
            expect(() => makeAccordion([])).not.toThrow();
        });

        it('handles zero-size rect without error', () => {
            expect(() => makeAccordion(SECTIONS, {}, 0, 0)).not.toThrow();
        });
    });

    describe('10. Height clipping', () => {
        it('does not throw when content exceeds available height', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion(SECTIONS, { multiple: true, openIndex: 0 }, 30, 3);
            accordion.open(1);
            accordion.open(2);

            const screen = new Screen(30, 3);
            accordion.updateRect({ x: 0, y: 0, width: 30, height: 3 });

            expect(() => accordion.render(screen)).not.toThrow();
            vi.restoreAllMocks();
        });

        it('content written beyond height boundary stays empty on screen', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion(SECTIONS, { multiple: true, openIndex: 0 }, 30, 2);
            accordion.open(1);
            accordion.open(2);

            accordion.updateRect({ x: 0, y: 0, width: 30, height: 2 });
            const screen = new Screen(30, 10);
            accordion.render(screen);

            // Rows 2–9 must be completely empty (widget must not have written past height)
            const overflowRows = screen.back.slice(2).filter(
                row => row.map((c: { char: string }) => c.char).join('').trim().length > 0
            );
            expect(overflowRows.length).toBe(0);
            vi.restoreAllMocks();
        });
    });

    describe('11. Width clipping', () => {
        it('does not throw with a very small width', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion(
                [{ title: 'A very long section title that exceeds narrow width', content: 'Body' }],
                {},
                5,
                10,
            );
            const screen = new Screen(5, 10);

            expect(() => accordion.render(screen)).not.toThrow();
            vi.restoreAllMocks();
        });

        it('each rendered row has exactly width chars (title is truncated to fit)', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion(
                [{ title: 'A very long section title', content: 'Body' }],
                {},
                8,
                5,
            );
            const screen = new Screen(8, 5);
            accordion.render(screen);

            const row0 = screen.back[0]!.map((c: { char: string }) => c.char).join('');
            expect(row0.length).toBe(8);
            vi.restoreAllMocks();
        });

        it('renders stably with a width of 1', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const accordion = makeAccordion(
                [{ title: 'T', content: 'B' }],
                {},
                1,
                5,
            );
            const screen = new Screen(1, 5);

            expect(() => accordion.render(screen)).not.toThrow();
            vi.restoreAllMocks();
        });
    });

    describe('12. getSections getter API', () => {
        it('returns correct sections', () => {
            const accordion = makeAccordion(SECTIONS);
            expect(accordion.getSections()).toBe(SECTIONS);
        });
    });
});