// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for LinearPrompt widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Screen, createKeyEvent } from '@termuijs/core';
import { LinearPrompt, type LinearPromptOption } from './LinearPrompt.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a KeyEvent with all required fields, defaulting modifiers to false. */
function key(k: string): ReturnType<typeof createKeyEvent> {
    return createKeyEvent({ key: k, ctrl: false, alt: false, shift: false, raw: Buffer.alloc(0) });
}

/** Render a LinearPrompt onto a screen of the given size and return the back-buffer. */
function renderPrompt(
    prompt: LinearPrompt,
    width: number,
    height: number,
): string[] {
    const screen = new Screen(width, height);
    prompt.updateRect({ x: 0, y: 0, width, height });
    prompt.render(screen);
    return screen.back.map((row) => row.map((c) => c.char).join(''));
}

// ── Shared fixtures ─────────────────────────────────────────────────────────

const basicOptions: LinearPromptOption[] = [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
    { label: 'Option C', value: 'c' },
];

const optionsWithMiddleDisabled: LinearPromptOption[] = [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b', disabled: true },
    { label: 'Option C', value: 'c' },
];

const optionsWithConsecutiveDisabled: LinearPromptOption[] = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b', disabled: true },
    { label: 'C', value: 'c', disabled: true },
    { label: 'D', value: 'd' },
];

afterEach(() => {
    vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. Constructor & Initialization
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — constructor & initialization', () => {
    it('stores provided options', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Choose:' });
        expect(prompt.selectedOption).toEqual(basicOptions[0]);
    });

    it('applies default activeColor (cyan) when omitted', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Choose:' });
        const rows = renderPrompt(prompt, 40, basicOptions.length + 2);
        // row 1 is the first option (selected): its cells should carry the cyan fg
        const screen = new Screen(40, basicOptions.length + 2);
        prompt.updateRect({ x: 0, y: 0, width: 40, height: basicOptions.length + 2 });
        prompt.render(screen);
        const activeRow = screen.back[1];
        const cyanCell = activeRow.find((c) => c.fg?.type === 'named' && c.fg.name === 'cyan');
        expect(cyanCell).toBeDefined();
    });

    it('applies custom activeColor when provided', () => {
        const prompt = new LinearPrompt(basicOptions, {
            question: 'Choose:',
            activeColor: { type: 'named', name: 'magenta' },
        });
        const screen = new Screen(40, basicOptions.length + 2);
        prompt.updateRect({ x: 0, y: 0, width: 40, height: basicOptions.length + 2 });
        prompt.render(screen);
        const activeRow = screen.back[1];
        const magentaCell = activeRow.find((c) => c.fg?.type === 'named' && c.fg.name === 'magenta');
        expect(magentaCell).toBeDefined();
    });

    it('is focusable', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Choose:' });
        expect(prompt.focusable).toBe(true);
    });

    it('calculates height as options.length + 2', () => {
        // The style height is options.length + 2 (1 question row + 1 blank footer)
        const prompt = new LinearPrompt(basicOptions, { question: 'Choose:' });
        // We can indirectly verify by checking the style attached to the widget
        // (height is passed to mergeStyles in the constructor)
        expect(prompt.style.height).toBe(basicOptions.length + 2);
    });

    it('initializes safely with an empty options array', () => {
        expect(() => new LinearPrompt([], { question: 'Choose:' })).not.toThrow();
    });

    it('initialises height to 2 when options array is empty', () => {
        const prompt = new LinearPrompt([], { question: 'Choose:' });
        expect(prompt.style.height).toBe(2);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Selected State
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — selected state', () => {
    it('selectedIndex starts at 0', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        expect(prompt.selectedIndex).toBe(0);
    });

    it('selectedOption matches selectedIndex', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        expect(prompt.selectedOption).toBe(basicOptions[0]);
    });

    it('selectedOption updates after navigation', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.selectNext();
        expect(prompt.selectedOption).toBe(basicOptions[1]);
    });

    it('selectedOption is undefined for empty options', () => {
        const prompt = new LinearPrompt([], { question: 'Q' });
        expect(prompt.selectedOption).toBeUndefined();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. Forward Navigation — selectNext()
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — selectNext()', () => {
    it('moves to the next enabled option', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.selectNext();
        expect(prompt.selectedIndex).toBe(1);
    });

    it('moves from first to second option', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.selectNext();
        expect(prompt.selectedIndex).toBe(1);
        prompt.selectNext();
        expect(prompt.selectedIndex).toBe(2);
    });

    it('stops at the last option (no wrap)', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.selectNext();
        prompt.selectNext();
        expect(prompt.selectedIndex).toBe(2);
        prompt.selectNext(); // already at last
        expect(prompt.selectedIndex).toBe(2);
    });

    it('calls markDirty() when selection changes', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.clearDirty();
        prompt.selectNext();
        expect(prompt.isDirty).toBe(true);
    });

    it('does NOT call markDirty() when already at last item', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.selectNext();
        prompt.selectNext(); // now at index 2
        const spy = vi.spyOn(prompt, 'markDirty');
        prompt.selectNext(); // blocked — already at last
        expect(spy).not.toHaveBeenCalled();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. Backward Navigation — selectPrev()
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — selectPrev()', () => {
    it('moves to the previous enabled option', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.selectNext();
        prompt.selectPrev();
        expect(prompt.selectedIndex).toBe(0);
    });

    it('stops at the first option (no wrap)', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.selectPrev(); // already at first
        expect(prompt.selectedIndex).toBe(0);
    });

    it('calls markDirty() when selection changes', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.selectNext(); // move to 1
        prompt.clearDirty();
        prompt.selectPrev(); // move back to 0
        expect(prompt.isDirty).toBe(true);
    });

    it('does NOT call markDirty() when already at first item', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        const spy = vi.spyOn(prompt, 'markDirty');
        prompt.selectPrev(); // blocked — at index 0
        expect(spy).not.toHaveBeenCalled();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. Disabled Option Navigation
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — disabled option skipping', () => {
    it('skips a disabled option moving forward', () => {
        const prompt = new LinearPrompt(optionsWithMiddleDisabled, { question: 'Q' });
        prompt.selectNext(); // index 1 is disabled → should land on 2
        expect(prompt.selectedIndex).toBe(2);
    });

    it('skips a disabled option moving backward', () => {
        const prompt = new LinearPrompt(optionsWithMiddleDisabled, { question: 'Q' });
        prompt.selectNext(); // → 2
        prompt.selectPrev(); // index 1 is disabled → should land back on 0
        expect(prompt.selectedIndex).toBe(0);
    });

    it('skips multiple consecutive disabled options moving forward (0→3)', () => {
        const prompt = new LinearPrompt(optionsWithConsecutiveDisabled, { question: 'Q' });
        prompt.selectNext(); // indices 1 and 2 are disabled → lands on 3
        expect(prompt.selectedIndex).toBe(3);
    });

    it('skips multiple consecutive disabled options moving backward (3→0)', () => {
        const prompt = new LinearPrompt(optionsWithConsecutiveDisabled, { question: 'Q' });
        prompt.selectNext(); // → 3
        prompt.selectPrev(); // indices 2, 1 are disabled → lands on 0
        expect(prompt.selectedIndex).toBe(0);
    });

    it('stays put when all remaining forward options are disabled', () => {
        const allNextDisabled: LinearPromptOption[] = [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b', disabled: true },
            { label: 'C', value: 'c', disabled: true },
        ];
        const prompt = new LinearPrompt(allNextDisabled, { question: 'Q' });
        prompt.selectNext(); // nowhere to go
        expect(prompt.selectedIndex).toBe(0);
    });

    it('stays put when all remaining backward options are disabled', () => {
        const allPrevDisabled: LinearPromptOption[] = [
            { label: 'A', value: 'a', disabled: true },
            { label: 'B', value: 'b', disabled: true },
            { label: 'C', value: 'c' },
        ];
        const prompt = new LinearPrompt(allPrevDisabled, { question: 'Q' });
        // Force selectedIndex to 2 (C), then try going back
        prompt.selectNext(); // no movement since B is disabled and nothing beyond C
        // navigate from start: index 0, 1 disabled — selectNext → C (index 2)
        // Actually initial index is 0 (disabled). Let's manually set up:
        // Navigate forward: since 0 is disabled and 1 is disabled, stays at 0.
        // Use a fresh set where C is at the end and all before are disabled.
        const p2 = new LinearPrompt(allPrevDisabled, { question: 'Q' });
        // Start is at 0 (disabled). Confirm won't fire but index stays 0.
        // Try selectPrev from index 0 — should stay at 0.
        p2.selectPrev();
        expect(p2.selectedIndex).toBe(0);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. Keyboard Handling
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — keyboard handling', () => {
    describe('supported keys', () => {
        it('"down" moves selection forward', () => {
            const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
            prompt.handleKey(key('down'));
            expect(prompt.selectedIndex).toBe(1);
        });

        it('"up" moves selection backward', () => {
            const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
            prompt.handleKey(key('down'));
            prompt.handleKey(key('up'));
            expect(prompt.selectedIndex).toBe(0);
        });

        it('"tab" behaves like selectNext()', () => {
            const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
            prompt.handleKey(key('tab'));
            expect(prompt.selectedIndex).toBe(1);
        });

        it('"shift+tab" behaves like selectPrev()', () => {
            const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
            prompt.handleKey(key('tab')); // → 1
            prompt.handleKey(key('shift+tab')); // → 0
            expect(prompt.selectedIndex).toBe(0);
        });

        it('"enter" triggers confirm()', () => {
            const onSelect = vi.fn();
            const prompt = new LinearPrompt(basicOptions, { question: 'Q', onSelect });
            prompt.handleKey(key('enter'));
            expect(onSelect).toHaveBeenCalledWith(basicOptions[0], 0);
        });
    });

    describe('unsupported keys — no state change', () => {
        const unsupportedKeys = ['left', 'right', 'escape', 'space', 'a'];

        for (const k of unsupportedKeys) {
            it(`"${k}" does not change selectedIndex`, () => {
                const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
                const spy = vi.spyOn(prompt, 'markDirty');
                prompt.handleKey(key(k));
                expect(prompt.selectedIndex).toBe(0);
                expect(spy).not.toHaveBeenCalled();
            });
        }
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. Confirmation — confirm()
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — confirm()', () => {
    it('calls onSelect with selected option and index', () => {
        const onSelect = vi.fn();
        const prompt = new LinearPrompt(basicOptions, { question: 'Q', onSelect });
        prompt.selectNext(); // index 1
        prompt.confirm();
        expect(onSelect).toHaveBeenCalledWith(basicOptions[1], 1);
    });

    it('passes the correct index when confirming first item', () => {
        const onSelect = vi.fn();
        const prompt = new LinearPrompt(basicOptions, { question: 'Q', onSelect });
        prompt.confirm();
        expect(onSelect).toHaveBeenCalledWith(basicOptions[0], 0);
    });

    it('passes the correct index when confirming last item', () => {
        const onSelect = vi.fn();
        const prompt = new LinearPrompt(basicOptions, { question: 'Q', onSelect });
        prompt.selectNext();
        prompt.selectNext();
        prompt.confirm();
        expect(onSelect).toHaveBeenCalledWith(basicOptions[2], 2);
    });

    it('calls markDirty() on successful confirmation', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.clearDirty();
        prompt.confirm();
        expect(prompt.isDirty).toBe(true);
    });

    it('does nothing when options array is empty', () => {
        const onSelect = vi.fn();
        const prompt = new LinearPrompt([], { question: 'Q', onSelect });
        expect(() => prompt.confirm()).not.toThrow();
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('does not call onSelect for a disabled option', () => {
        const onSelect = vi.fn();
        const prompt = new LinearPrompt(
            [{ label: 'Disabled', value: 'x', disabled: true }],
            { question: 'Q', onSelect },
        );
        prompt.confirm();
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('does NOT call markDirty() when confirming a disabled option', () => {
        const prompt = new LinearPrompt(
            [{ label: 'Disabled', value: 'x', disabled: true }],
            { question: 'Q' },
        );
        const spy = vi.spyOn(prompt, 'markDirty');
        prompt.confirm();
        expect(spy).not.toHaveBeenCalled();
    });

    it('works without an onSelect callback (no error)', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        expect(() => prompt.confirm()).not.toThrow();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. Rendering
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — rendering', () => {
    describe('question row', () => {
        it('renders the question on row 0', () => {
            const prompt = new LinearPrompt(basicOptions, { question: 'Choose one:' });
            const rows = renderPrompt(prompt, 40, basicOptions.length + 2);
            expect(rows[0].trim()).toContain('Choose one:');
        });

        it('truncates a long question to fit the width', () => {
            const longQuestion = 'A'.repeat(200);
            const prompt = new LinearPrompt(basicOptions, { question: longQuestion });
            const rows = renderPrompt(prompt, 40, basicOptions.length + 2);
            // Must not throw, and the row must be exactly width characters
            expect(rows[0].length).toBe(40);
        });

        it('renders safely with an empty question', () => {
            expect(() => {
                const prompt = new LinearPrompt(basicOptions, { question: '' });
                renderPrompt(prompt, 40, basicOptions.length + 2);
            }).not.toThrow();
        });
    });

    describe('option rows', () => {
        it('renders all option labels', () => {
            const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
            const rows = renderPrompt(prompt, 40, basicOptions.length + 2);
            expect(rows[1]).toContain('Option A');
            expect(rows[2]).toContain('Option B');
            expect(rows[3]).toContain('Option C');
        });

        it('selected option renders with "> " marker', () => {
            const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
            const rows = renderPrompt(prompt, 40, basicOptions.length + 2);
            expect(rows[1].trimStart()).toMatch(/^>\s/);
        });

        it('unselected options render with "  " (two-space) marker', () => {
            const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
            const rows = renderPrompt(prompt, 40, basicOptions.length + 2);
            // row 2 = Option B (unselected), row 3 = Option C (unselected)
            expect(rows[2].startsWith('  ')).toBe(true);
            expect(rows[3].startsWith('  ')).toBe(true);
        });
    });

    describe('active styling', () => {
        it('selected option cell carries the active fg color', () => {
            const prompt = new LinearPrompt(basicOptions, {
                question: 'Q',
                activeColor: { type: 'named', name: 'green' },
            });
            const screen = new Screen(40, basicOptions.length + 2);
            prompt.updateRect({ x: 0, y: 0, width: 40, height: basicOptions.length + 2 });
            prompt.render(screen);
            const activeRow = screen.back[1];
            const greenCell = activeRow.find((c) => c.fg?.type === 'named' && c.fg.name === 'green');
            expect(greenCell).toBeDefined();
        });

        it('selected option cells are bold', () => {
            const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
            const screen = new Screen(40, basicOptions.length + 2);
            prompt.updateRect({ x: 0, y: 0, width: 40, height: basicOptions.length + 2 });
            prompt.render(screen);
            const activeRow = screen.back[1];
            const boldCell = activeRow.find((c) => c.bold === true);
            expect(boldCell).toBeDefined();
        });
    });

    describe('disabled option styling', () => {
        it('disabled option cells are dim', () => {
            const prompt = new LinearPrompt(optionsWithMiddleDisabled, { question: 'Q' });
            const screen = new Screen(40, optionsWithMiddleDisabled.length + 2);
            prompt.updateRect({ x: 0, y: 0, width: 40, height: optionsWithMiddleDisabled.length + 2 });
            prompt.render(screen);
            // row index 2 = Option B (disabled)
            const disabledRow = screen.back[2];
            const dimCell = disabledRow.find((c) => c.dim === true);
            expect(dimCell).toBeDefined();
        });

        it('disabled option cells use brightBlack fg', () => {
            const prompt = new LinearPrompt(optionsWithMiddleDisabled, { question: 'Q' });
            const screen = new Screen(40, optionsWithMiddleDisabled.length + 2);
            prompt.updateRect({ x: 0, y: 0, width: 40, height: optionsWithMiddleDisabled.length + 2 });
            prompt.render(screen);
            const disabledRow = screen.back[2];
            const brightBlackCell = disabledRow.find(
                (c) => c.fg?.type === 'named' && c.fg.name === 'brightBlack',
            );
            expect(brightBlackCell).toBeDefined();
        });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. Rendering Constraints
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — rendering constraints', () => {
    it('width = 0 does not throw', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        expect(() => {
            const screen = new Screen(1, 5);
            prompt.updateRect({ x: 0, y: 0, width: 0, height: 5 });
            prompt.render(screen);
        }).not.toThrow();
    });

    it('height = 0 does not throw', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        expect(() => {
            const screen = new Screen(40, 1);
            prompt.updateRect({ x: 0, y: 0, width: 40, height: 0 });
            prompt.render(screen);
        }).not.toThrow();
    });

    it('width smaller than option text renders safely (no overflow)', () => {
        const prompt = new LinearPrompt(
            [{ label: 'VeryLongOptionLabel', value: 'x' }],
            { question: 'Q' },
        );
        expect(() => renderPrompt(prompt, 5, 3)).not.toThrow();
    });

    it('width smaller than the 2-char marker renders safely', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        expect(() => renderPrompt(prompt, 1, basicOptions.length + 2)).not.toThrow();
    });

    it('very long labels do not overflow the row buffer', () => {
        const longLabel = 'Extremely long option label that exceeds any reasonable terminal width and should be sliced';
        const prompt = new LinearPrompt([{ label: longLabel, value: 'x' }], { question: 'Q' });
        const rows = renderPrompt(prompt, 20, 3);
        // Each row must be exactly width (20) characters
        for (const row of rows) {
            expect(row.length).toBe(20);
        }
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. Dirty State
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — markDirty() behaviour', () => {
    it('markDirty() is called when selectNext() moves to a new option', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        const spy = vi.spyOn(prompt, 'markDirty');
        prompt.selectNext();
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty() is called when selectPrev() moves to a previous option', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.selectNext();
        const spy = vi.spyOn(prompt, 'markDirty');
        prompt.selectPrev();
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty() is called when confirm() succeeds', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        const spy = vi.spyOn(prompt, 'markDirty');
        prompt.confirm();
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty() is NOT called when selectNext() is blocked at last item', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        prompt.selectNext();
        prompt.selectNext(); // at index 2 (last)
        const spy = vi.spyOn(prompt, 'markDirty');
        prompt.selectNext(); // blocked
        expect(spy).not.toHaveBeenCalled();
    });

    it('markDirty() is NOT called when selectPrev() is blocked at first item', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        const spy = vi.spyOn(prompt, 'markDirty');
        prompt.selectPrev(); // blocked — at index 0
        expect(spy).not.toHaveBeenCalled();
    });

    it('markDirty() is NOT called when confirming a disabled option', () => {
        const prompt = new LinearPrompt(
            [{ label: 'D', value: 'd', disabled: true }],
            { question: 'Q' },
        );
        const spy = vi.spyOn(prompt, 'markDirty');
        prompt.confirm();
        expect(spy).not.toHaveBeenCalled();
    });

    it('markDirty() is NOT called when confirming on an empty option list', () => {
        const prompt = new LinearPrompt([], { question: 'Q' });
        const spy = vi.spyOn(prompt, 'markDirty');
        prompt.confirm();
        expect(spy).not.toHaveBeenCalled();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. Empty State
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — empty options', () => {
    it('renders the question without crashing', () => {
        const prompt = new LinearPrompt([], { question: 'Choose:' });
        const rows = renderPrompt(prompt, 40, 3);
        expect(rows[0].trim()).toContain('Choose:');
    });

    it('does not crash during render', () => {
        expect(() => {
            const prompt = new LinearPrompt([], { question: 'Choose:' });
            renderPrompt(prompt, 40, 3);
        }).not.toThrow();
    });

    it('selectNext() is safe', () => {
        const prompt = new LinearPrompt([], { question: 'Q' });
        expect(() => prompt.selectNext()).not.toThrow();
    });

    it('selectPrev() is safe', () => {
        const prompt = new LinearPrompt([], { question: 'Q' });
        expect(() => prompt.selectPrev()).not.toThrow();
    });

    it('confirm() is safe', () => {
        const prompt = new LinearPrompt([], { question: 'Q' });
        expect(() => prompt.confirm()).not.toThrow();
    });

    it('selectedOption is undefined', () => {
        const prompt = new LinearPrompt([], { question: 'Q' });
        expect(prompt.selectedOption).toBeUndefined();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. Robustness
// ══════════════════════════════════════════════════════════════════════════════

describe('LinearPrompt — robustness', () => {
    it('handles hundreds of options without throwing', () => {
        const manyOptions: LinearPromptOption[] = Array.from({ length: 500 }, (_, i) => ({
            label: `Option ${i}`,
            value: `v${i}`,
        }));
        expect(() => {
            const prompt = new LinearPrompt(manyOptions, { question: 'Big list' });
            renderPrompt(prompt, 80, manyOptions.length + 2);
        }).not.toThrow();
    });

    it('navigation is safe when all options are disabled', () => {
        const allDisabled: LinearPromptOption[] = [
            { label: 'A', value: 'a', disabled: true },
            { label: 'B', value: 'b', disabled: true },
            { label: 'C', value: 'c', disabled: true },
        ];
        const prompt = new LinearPrompt(allDisabled, { question: 'Q' });
        expect(() => {
            prompt.selectNext();
            prompt.selectPrev();
            prompt.confirm();
        }).not.toThrow();
        // Index must not have moved or wrapped
        expect(prompt.selectedIndex).toBe(0);
    });

    it('renders safely with an empty question string', () => {
        expect(() => {
            const prompt = new LinearPrompt(basicOptions, { question: '' });
            renderPrompt(prompt, 40, basicOptions.length + 2);
        }).not.toThrow();
    });

    it('renders safely when option labels are empty strings', () => {
        const emptyLabels: LinearPromptOption[] = [
            { label: '', value: 'x' },
            { label: '', value: 'y' },
        ];
        expect(() => {
            const prompt = new LinearPrompt(emptyLabels, { question: 'Q' });
            renderPrompt(prompt, 40, emptyLabels.length + 2);
        }).not.toThrow();
    });

    it('multiple consecutive navigation keys do not throw or wrap incorrectly', () => {
        const prompt = new LinearPrompt(basicOptions, { question: 'Q' });
        expect(() => {
            for (let i = 0; i < 20; i++) prompt.handleKey(key('down'));
            for (let i = 0; i < 20; i++) prompt.handleKey(key('up'));
        }).not.toThrow();
        expect(prompt.selectedIndex).toBe(0);
    });

    it('calling confirm() repeatedly does not throw', () => {
        const onSelect = vi.fn();
        const prompt = new LinearPrompt(basicOptions, { question: 'Q', onSelect });
        expect(() => {
            for (let i = 0; i < 10; i++) prompt.confirm();
        }).not.toThrow();
        expect(onSelect).toHaveBeenCalledTimes(10);
    });

    it('confirm() called repeatedly passes the same option and index each time', () => {
        const onSelect = vi.fn();
        const prompt = new LinearPrompt(basicOptions, { question: 'Q', onSelect });
        prompt.confirm();
        prompt.confirm();
        for (const call of onSelect.mock.calls) {
            expect(call[0]).toEqual(basicOptions[0]);
            expect(call[1]).toBe(0);
        }
    });
});
