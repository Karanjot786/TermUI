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
});
