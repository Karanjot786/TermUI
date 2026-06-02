// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Collapsible widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Collapsible } from './Collapsible.js';

// ── Helpers ──────────────────────────────────────────

function makeCollapsible(
    title: string,
    body: string,
    open = false,
    width = 40,
    height = 20,
) {
    const collapsible = new Collapsible(title, body, {}, { open });
    collapsible.updateRect({ x: 0, y: 0, width, height });
    return collapsible;
}

function renderCollapsible(
    collapsible: Collapsible,
    width = 40,
    height = 20,
): Screen {
    const screen = new Screen(width, height);
    collapsible.updateRect({ x: 0, y: 0, width, height });
    collapsible.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

// ── Tests ─────────────────────────────────────────────

describe('Collapsible', () => {
    describe('1. Closed state', () => {
        it('renders title with expand indicator when closed', () => {
            const collapsible = makeCollapsible('Settings', 'Some body');
            const screen = renderCollapsible(collapsible);

            const row0 = rowText(screen, 0);
            // Should have expand char (▶ or >) followed by title
            expect(row0).toMatch(/[▶>]\s*Settings/);
        });

        it('does not render body when closed', () => {
            const collapsible = makeCollapsible('Settings', 'Line 1\nLine 2\nLine 3');
            const screen = renderCollapsible(collapsible);

            const row1 = rowText(screen, 1);
            const row2 = rowText(screen, 2);

            // Body lines should be empty
            expect(row1.trim()).toBe('');
            expect(row2.trim()).toBe('');
        });

        it('has height of 1 when closed', () => {
            const collapsible = makeCollapsible('Settings', 'Some body');
            expect(collapsible.style.height).toBe(1);
        });
    });

    describe('2. Open state', () => {
        it('renders title with collapse indicator when open', () => {
            const collapsible = makeCollapsible('Settings', 'Some body', true);
            const screen = renderCollapsible(collapsible);

            const row0 = rowText(screen, 0);
            // Should have collapse char (▼ or v) followed by title
            expect(row0).toMatch(/[▼v]\s*Settings/);
        });

        it('renders body when open', () => {
            const body = 'Line 1\nLine 2\nLine 3';
            const collapsible = makeCollapsible('Settings', body, true);
            const screen = renderCollapsible(collapsible);

            const row0 = rowText(screen, 0);
            const row1 = rowText(screen, 1);
            const row2 = rowText(screen, 2);
            const row3 = rowText(screen, 3);

            expect(row0).toContain('Settings');
            expect(row1).toContain('Line 1');
            expect(row2).toContain('Line 2');
            expect(row3).toContain('Line 3');
        });

        it('has height of 1 + number of body lines when open', () => {
            const body = 'Line 1\nLine 2\nLine 3';
            const collapsible = makeCollapsible('Settings', body, true);
            expect(collapsible.style.height).toBe(4); // 1 (title) + 3 (lines)
        });
    });

    describe('3. Toggle functionality', () => {
        it('toggle() switches from closed to open', () => {
            const collapsible = makeCollapsible('Settings', 'Some body', false);
            expect(collapsible.isOpen()).toBe(false);

            collapsible.toggle();

            expect(collapsible.isOpen()).toBe(true);
        });

        it('toggle() switches from open to closed', () => {
            const collapsible = makeCollapsible('Settings', 'Some body', true);
            expect(collapsible.isOpen()).toBe(true);

            collapsible.toggle();

            expect(collapsible.isOpen()).toBe(false);
        });

        it('toggle() updates height correctly', () => {
            const body = 'Line 1\nLine 2';
            const collapsible = makeCollapsible('Settings', body, false);
            expect(collapsible.style.height).toBe(1);

            collapsible.toggle();
            expect(collapsible.style.height).toBe(3); // 1 + 2

            collapsible.toggle();
            expect(collapsible.style.height).toBe(1);
        });

        it('toggle() calls onToggle callback', () => {
            const onToggle = vi.fn();
            const collapsible = new Collapsible(
                'Settings',
                'Some body',
                {},
                { onToggle },
            );
            collapsible.updateRect({ x: 0, y: 0, width: 40, height: 20 });

            collapsible.toggle();
            expect(onToggle).toHaveBeenCalledWith(true);

            collapsible.toggle();
            expect(onToggle).toHaveBeenCalledWith(false);
        });

        it('toggle() calls markDirty()', () => {
            const collapsible = makeCollapsible('Settings', 'Some body');
            const markDirtySpy = vi.spyOn(collapsible, 'markDirty');

            collapsible.toggle();

            expect(markDirtySpy).toHaveBeenCalled();
        });
    });

    describe('4. Keyboard navigation', () => {
        it('enter key toggles', () => {
            const collapsible = makeCollapsible('Settings', 'Some body', false);
            expect(collapsible.isOpen()).toBe(false);

            collapsible.handleKey({
                key: 'enter',
                ctrl: false,
                alt: false,
            } as any);

            expect(collapsible.isOpen()).toBe(true);
        });

        it('space key toggles', () => {
            const collapsible = makeCollapsible('Settings', 'Some body', false);
            expect(collapsible.isOpen()).toBe(false);

            collapsible.handleKey({
                key: 'space',
                ctrl: false,
                alt: false,
            } as any);

            expect(collapsible.isOpen()).toBe(true);
        });

        it('other keys are ignored', () => {
            const collapsible = makeCollapsible('Settings', 'Some body', false);

            collapsible.handleKey({
                key: 'a',
                ctrl: false,
                alt: false,
            } as any);

            expect(collapsible.isOpen()).toBe(false);
        });
    });

    describe('5. Unicode/ASCII fallback', () => {
        it('uses unicode chars when caps.unicode is true', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const collapsible = new Collapsible('Settings', 'Body');
            const screen = renderCollapsible(collapsible);

            const row0 = rowText(screen, 0);
            expect(row0).toMatch(/▶\s*Settings/);

            vi.restoreAllMocks();
        });

        it('uses ASCII chars when caps.unicode is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

            const collapsible = new Collapsible('Settings', 'Body');
            const screen = renderCollapsible(collapsible);

            const row0 = rowText(screen, 0);
            expect(row0).toMatch(/>\s*Settings/);

            vi.restoreAllMocks();
        });
    });

    describe('6. setTitle and setBody', () => {
        it('setTitle updates the title', () => {
            const collapsible = makeCollapsible('Old', 'Body');
            collapsible.setTitle('New');
            const screen = renderCollapsible(collapsible);

            const row0 = rowText(screen, 0);
            expect(row0).toContain('New');
            expect(row0).not.toContain('Old');
        });

        it('setBody updates the body when open', () => {
            const collapsible = makeCollapsible('Title', 'Old Body', true);
            collapsible.setBody('New Body Line 1\nNew Body Line 2');
            const screen = renderCollapsible(collapsible);

            const row1 = rowText(screen, 1);
            const row2 = rowText(screen, 2);

            expect(row1).toContain('New Body Line 1');
            expect(row2).toContain('New Body Line 2');
        });

        it('setBody updates height when open', () => {
            const collapsible = makeCollapsible('Title', 'Old', true);
            expect(collapsible.style.height).toBe(2); // 1 + 1

            collapsible.setBody('Line 1\nLine 2\nLine 3');
            expect(collapsible.style.height).toBe(4); // 1 + 3
        });
    });

    describe('7. isOpen method', () => {
        it('returns false when closed', () => {
            const collapsible = makeCollapsible('Title', 'Body', false);
            expect(collapsible.isOpen()).toBe(false);
        });

        it('returns true when open', () => {
            const collapsible = makeCollapsible('Title', 'Body', true);
            expect(collapsible.isOpen()).toBe(true);
        });
    });
});
