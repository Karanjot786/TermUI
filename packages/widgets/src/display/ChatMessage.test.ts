// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for ChatMessage widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { ChatMessage } from './ChatMessage.js';

// ── Helpers ──────────────────────────────────────────

function makeChat(
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    width = 60,
    height = 10,
    timestamp?: Date,
): ChatMessage {
    const widget = new ChatMessage({ role, content, timestamp });
    widget.updateRect({ x: 0, y: 0, width, height });
    return widget;
}

function renderChat(widget: ChatMessage, width = 60, height = 10): Screen {
    const screen = new Screen(width, height);
    widget.updateRect({ x: 0, y: 0, width, height });
    widget.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

function cellFg(screen: Screen, row: number, col: number): unknown {
    return screen.back[row]?.[col]?.fg;
}

function cellDim(screen: Screen, row: number, col: number): boolean {
    return screen.back[row]?.[col]?.dim ?? false;
}

// ── Tests ─────────────────────────────────────────────

describe('ChatMessage', () => {

    describe('1. User role badge is [User] with cyan color', () => {
        it('renders [User] badge on row 0', () => {
            const widget = makeChat('user', 'Hello world');
            const screen = renderChat(widget);

            const row = rowText(screen, 0);
            expect(row).toContain('[User]');
        });

        it('[User] badge has cyan fg', () => {
            const widget = makeChat('user', 'Hello world');
            const screen = renderChat(widget);

            // col 0 is start of badge
            const fg = cellFg(screen, 0, 0) as { type: string; name: string } | undefined;
            expect(fg).toBeDefined();
            expect(fg?.type).toBe('named');
            expect(fg?.name).toBe('cyan');
        });
    });

    describe('2. Assistant role badge is [Assistant] with green color', () => {
        it('renders [Assistant] badge on row 0', () => {
            const widget = makeChat('assistant', 'I can help with that.');
            const screen = renderChat(widget);

            const row = rowText(screen, 0);
            expect(row).toContain('[Assistant]');
        });

        it('[Assistant] badge has green fg', () => {
            const widget = makeChat('assistant', 'I can help with that.');
            const screen = renderChat(widget);

            const fg = cellFg(screen, 0, 0) as { type: string; name: string } | undefined;
            expect(fg?.type).toBe('named');
            expect(fg?.name).toBe('green');
        });
    });

    describe('3. System badge is yellow, tool badge is magenta', () => {
        it('[System] badge has yellow fg', () => {
            const widget = makeChat('system', 'System message.');
            const screen = renderChat(widget);

            const row = rowText(screen, 0);
            expect(row).toContain('[System]');

            const fg = cellFg(screen, 0, 0) as { type: string; name: string } | undefined;
            expect(fg?.type).toBe('named');
            expect(fg?.name).toBe('yellow');
        });

        it('[Tool] badge has magenta fg', () => {
            const widget = makeChat('tool', 'Tool output.');
            const screen = renderChat(widget);

            const row = rowText(screen, 0);
            expect(row).toContain('[Tool]');

            const fg = cellFg(screen, 0, 0) as { type: string; name: string } | undefined;
            expect(fg?.type).toBe('named');
            expect(fg?.name).toBe('magenta');
        });
    });

    describe('4. Content text appears on row 1 (after badge row)', () => {
        it('content is on row 1 with 2-space indent', () => {
            const widget = makeChat('assistant', 'Hello there');
            const screen = renderChat(widget);

            const row1 = rowText(screen, 1);
            expect(row1).toMatch(/^\s{2}Hello there/);
        });

        it('row 0 only contains the badge, not the content', () => {
            const widget = makeChat('user', 'My message content');
            const screen = renderChat(widget);

            const row0 = rowText(screen, 0);
            expect(row0).toContain('[User]');
            expect(row0).not.toContain('My message content');
        });
    });

    describe('5. Long content word-wraps across multiple lines', () => {
        it('wraps long content across rows 1 and 2', () => {
            // 60-wide widget, indent=2, contentWidth=58
            // Use content longer than 58 chars that has spaces to wrap at
            const content = 'The quick brown fox jumps over the lazy dog and then continues to run even further down the road';
            const widget = makeChat('assistant', content, 60, 10);
            const screen = renderChat(widget, 60, 10);

            const row1 = rowText(screen, 1);
            const row2 = rowText(screen, 2);

            // Row 1 should have something
            expect(row1.trim().length).toBeGreaterThan(0);
            // Row 2 should also have content (wrap happened)
            expect(row2.trim().length).toBeGreaterThan(0);
        });

        it('all wrapped lines have 2-space indent', () => {
            const content = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';
            const widget = makeChat('user', content, 40, 10);
            const screen = renderChat(widget, 40, 10);

            // Check that row 1 and row 2 both start with two spaces
            const row1 = rowText(screen, 1);
            const row2 = rowText(screen, 2);

            if (row1.length > 0) expect(row1.startsWith('  ')).toBe(true);
            if (row2.trim().length > 0) expect(row2.startsWith('  ')).toBe(true);
        });
    });

    describe('6. setContent() updates content and marks dirty', () => {
        it('updates rendered content after setContent()', () => {
            const widget = makeChat('user', 'Initial content');
            widget.setContent('Updated content');

            const screen = renderChat(widget);
            const row1 = rowText(screen, 1);
            expect(row1).toContain('Updated content');
            expect(row1).not.toContain('Initial content');
        });

        it('marks widget dirty after setContent()', () => {
            const widget = makeChat('user', 'Initial');
            widget.clearDirty();
            expect(widget.isDirty).toBe(false);

            widget.setContent('Changed');
            expect(widget.isDirty).toBe(true);
        });
    });

    describe('7. setRole() updates role and marks dirty', () => {
        it('updates rendered badge after setRole()', () => {
            const widget = makeChat('user', 'Hello');
            widget.setRole('assistant');

            const screen = renderChat(widget);
            const row0 = rowText(screen, 0);
            expect(row0).toContain('[Assistant]');
            expect(row0).not.toContain('[User]');
        });

        it('marks widget dirty after setRole()', () => {
            const widget = makeChat('user', 'Hello');
            widget.clearDirty();
            expect(widget.isDirty).toBe(false);

            widget.setRole('system');
            expect(widget.isDirty).toBe(true);
        });
    });

    describe('8. Timestamp appears on row 0 (dim) when provided', () => {
        it('renders timestamp text on row 0 when provided', () => {
            // Use a fixed time for predictable output
            const ts = new Date('2024-01-15T12:34:05');
            const widget = makeChat('assistant', 'Hello', 60, 10, ts);
            const screen = renderChat(widget, 60, 10);

            const row0 = rowText(screen, 0);
            // Should contain some time-like digits
            expect(row0).toMatch(/\d{2}:\d{2}:\d{2}/);
        });

        it('timestamp cells are dim', () => {
            const ts = new Date('2024-01-15T12:34:05');
            const widget = new ChatMessage({ role: 'user', content: 'hi', timestamp: ts });
            const screen = new Screen(60, 10);
            widget.updateRect({ x: 0, y: 0, width: 60, height: 10 });
            widget.render(screen);

            // Timestamp is right-aligned on row 0 — check the last non-space chars
            // HH:MM:SS = 8 chars, so cols 52..59 should have the timestamp
            const tsStr = ts.toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            });
            const tsStart = 60 - tsStr.length;
            // At least one timestamp cell should be dim
            const dimFound = Array.from({ length: tsStr.length }, (_, i) =>
                cellDim(screen, 0, tsStart + i)
            ).some(d => d);
            expect(dimFound).toBe(true);
        });

        it('does not render timestamp when not provided', () => {
            const widget = makeChat('assistant', 'No timestamp here', 60, 10);
            const screen = renderChat(widget, 60, 10);

            const row0 = rowText(screen, 0);
            // Only the badge, no time format
            expect(row0).not.toMatch(/\d{2}:\d{2}:\d{2}/);
        });
    });
});

describe('9. Performance optimizations', () => {
    it('does not mark dirty when setContent receives the same value', () => {
        const widget = makeChat('user', 'Hello');

        widget.clearDirty();

        widget.setContent('Hello');

        expect(widget.isDirty).toBe(false);
    });

    it('marks dirty when setContent receives a different value', () => {
        const widget = makeChat('user', 'Hello');

        widget.clearDirty();

        widget.setContent('Updated');

        expect(widget.isDirty).toBe(true);
    });

    it('does not mark dirty when setRole receives the same role', () => {
        const widget = makeChat('assistant', 'Hello');

        widget.clearDirty();

        widget.setRole('assistant');

        expect(widget.isDirty).toBe(false);
    });

    it('marks dirty when setRole receives a different role', () => {
        const widget = makeChat('assistant', 'Hello');

        widget.clearDirty();

        widget.setRole('system');

        expect(widget.isDirty).toBe(true);
    });
});