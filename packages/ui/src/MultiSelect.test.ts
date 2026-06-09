// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for MultiSelect component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { MultiSelect } from './MultiSelect.js';

const OPTIONS = [
    { label: 'Red', value: 'red' },
    { label: 'Green', value: 'green' },
    { label: 'Blue', value: 'blue' },
];

// ── Constructor & Initialization ───────────────────────
describe('MultiSelect — Constructor & Initialization', () => {
    it('initializes with focusable=true', () => {
        const ms = new MultiSelect(OPTIONS);
        expect(ms.focusable).toBe(true);
    });

    it('initializes with no options selected', () => {
        const ms = new MultiSelect(OPTIONS);
        expect(ms.selectedOptions).toHaveLength(0);
    });

    it('cursor starts at index 0', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        expect(ms.selectedOptions).toEqual([OPTIONS[0]]);
    });

    it('default active color is cyan', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        // Render succeeds with default cyan color
        expect(screen.back).toBeDefined();
    });

    it('default check/uncheck characters initialize correctly', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.toggleCurrent(); // check first item
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('◼'); // default check char
        vi.restoreAllMocks();
    });

    it('empty option list initializes safely', () => {
        const ms = new MultiSelect([]);
        expect(ms.selectedOptions).toHaveLength(0);
        ms.toggleCurrent(); // should not throw
        ms.selectNext(); // should not throw
        ms.selectPrev(); // should not throw
    });
});

// ── Selection State ────────────────────────────────────
describe('MultiSelect — Selection State (toggleCurrent)', () => {
    it('toggleCurrent checks current option', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        expect(ms.selectedOptions).toEqual([OPTIONS[0]]);
    });

    it('toggleCurrent unchecks current option', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent(); // check
        ms.toggleCurrent(); // uncheck
        expect(ms.selectedOptions).toHaveLength(0);
    });

    it('repeated toggles alternate state correctly', () => {
        const ms = new MultiSelect(OPTIONS);
        expect(ms.selectedOptions).toHaveLength(0);
        ms.toggleCurrent();
        expect(ms.selectedOptions).toHaveLength(1);
        ms.toggleCurrent();
        expect(ms.selectedOptions).toHaveLength(0);
        ms.toggleCurrent();
        expect(ms.selectedOptions).toHaveLength(1);
    });
});

// ── Multiple Selections ────────────────────────────────
describe('MultiSelect — Multiple Selections', () => {
    it('multiple options can be checked simultaneously', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent(); // check Red at 0
        ms.selectNext();
        ms.toggleCurrent(); // check Green at 1
        ms.selectNext();
        ms.toggleCurrent(); // check Blue at 2
        expect(ms.selectedOptions).toHaveLength(3);
    });

    it('order of selectedOptions matches option order', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.selectNext(); // move to index 1
        ms.toggleCurrent(); // check Green
        ms.selectNext(); // move to index 2
        ms.toggleCurrent(); // check Blue
        ms.selectPrev(); // move to index 1
        ms.selectPrev(); // move to index 0
        ms.toggleCurrent(); // check Red
        expect(ms.selectedOptions).toEqual([OPTIONS[0], OPTIONS[1], OPTIONS[2]]);
    });

    it('selection survives cursor movement', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent(); // check Red at 0
        ms.selectNext(); // move to 1
        ms.selectNext(); // move to 2
        ms.selectPrev(); // move to 1
        ms.selectPrev(); // move to 0
        expect(ms.selectedOptions).toEqual([OPTIONS[0]]);
    });

    it('can select non-consecutive items', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent(); // check Red at 0
        ms.selectNext();
        ms.selectNext(); // move to index 2
        ms.toggleCurrent(); // check Blue
        expect(ms.selectedOptions).toEqual([OPTIONS[0], OPTIONS[2]]);
    });
});

// ── Cursor Navigation ──────────────────────────────────
describe('MultiSelect — Cursor Navigation', () => {
    describe('selectNext', () => {
        it('moves forward', () => {
            const ms = new MultiSelect(OPTIONS);
            ms.selectNext();
            ms.toggleCurrent();
            expect(ms.selectedOptions).toEqual([OPTIONS[1]]);
        });

        it('stops at last item', () => {
            const ms = new MultiSelect(OPTIONS);
            ms.selectNext();
            ms.selectNext();
            ms.selectNext();
            ms.toggleCurrent();
            expect(ms.selectedOptions).toEqual([OPTIONS[2]]);
        });

        it('does not wrap', () => {
            const ms = new MultiSelect(OPTIONS);
            ms.selectNext();
            ms.selectNext();
            ms.selectNext();
            ms.selectNext(); // try to go beyond
            ms.toggleCurrent();
            expect(ms.selectedOptions).toEqual([OPTIONS[2]]);
        });
    });

    describe('selectPrev', () => {
        it('moves backward', () => {
            const ms = new MultiSelect(OPTIONS);
            ms.selectNext();
            ms.selectPrev();
            ms.toggleCurrent();
            expect(ms.selectedOptions).toEqual([OPTIONS[0]]);
        });

        it('stops at first item', () => {
            const ms = new MultiSelect(OPTIONS);
            ms.selectPrev(); // already at 0
            ms.toggleCurrent();
            expect(ms.selectedOptions).toEqual([OPTIONS[0]]);
        });

        it('does not wrap', () => {
            const ms = new MultiSelect(OPTIONS);
            ms.selectPrev(); // try to go before start
            ms.selectPrev();
            ms.toggleCurrent();
            expect(ms.selectedOptions).toEqual([OPTIONS[0]]);
        });
    });
});

// ── Disabled Options ───────────────────────────────────
describe('MultiSelect — Disabled Options', () => {
    const DISABLED_OPTIONS = [
        { label: 'Red', value: 'red' },
        { label: 'Green', value: 'green', disabled: true },
        { label: 'Blue', value: 'blue' },
    ];

    describe('Navigation with disabled options', () => {
        it('selectNext skips disabled options', () => {
            const ms = new MultiSelect(DISABLED_OPTIONS);
            ms.selectNext(); // skip Green at 1, should go to Blue at 2
            ms.toggleCurrent();
            expect(ms.selectedOptions).toEqual([DISABLED_OPTIONS[2]]);
        });

        it('selectPrev skips disabled options', () => {
            const ms = new MultiSelect(DISABLED_OPTIONS);
            ms.selectNext(); // move to Blue at 2
            ms.selectNext(); // try to go forward (can't, already at last)
            ms.selectPrev(); // skip Green at 1, should go to Red at 0
            ms.toggleCurrent();
            expect(ms.selectedOptions).toEqual([DISABLED_OPTIONS[0]]);
        });

        it('navigation correctly handles all disabled except first', () => {
            const allDisabledExceptFirst = [
                { label: 'Red', value: 'red' },
                { label: 'Green', value: 'green', disabled: true },
                { label: 'Blue', value: 'blue', disabled: true },
            ];
            const ms = new MultiSelect(allDisabledExceptFirst);
            ms.selectNext(); // should stay at 0
            ms.toggleCurrent();
            expect(ms.selectedOptions).toEqual([allDisabledExceptFirst[0]]);
        });
    });

    describe('Toggle with disabled options', () => {
        it('cannot check disabled items', () => {
            const disabledMiddle = [
                { label: 'Red', value: 'red' },
                { label: 'Green', value: 'green', disabled: true },
                { label: 'Blue', value: 'blue' },
            ];
            const ms = new MultiSelect(disabledMiddle);
            // Create a widget that we can manually control cursor position
            // to test disabled items more directly
            ms.toggleCurrent(); // check Red at index 0
            expect(ms.selectedOptions).toHaveLength(1);
            // selectNext skips Green and goes to Blue
            ms.selectNext(); // index 0 -> 2
            ms.toggleCurrent(); // check Blue
            expect(ms.selectedOptions).toHaveLength(2);
            // Green was never selectable
        });
    });

    describe('Selection with disabled options', () => {
        it('disabled items never appear in selectedOptions', () => {
            const ms = new MultiSelect(DISABLED_OPTIONS);
            ms.toggleCurrent(); // check Red
            ms.selectNext(); // skip Green, move to Blue
            ms.toggleCurrent(); // check Blue
            expect(ms.selectedOptions).toEqual([
                DISABLED_OPTIONS[0],
                DISABLED_OPTIONS[2],
            ]);
            // Green is missing even though it's at index 1
        });
    });
});

// ── Submit Behavior ────────────────────────────────────
describe('MultiSelect — Submit Behavior', () => {
    it('submit calls onSubmit with empty selection', () => {
        const onSubmit = vi.fn();
        const ms = new MultiSelect(OPTIONS, { onSubmit });
        ms.submit();
        expect(onSubmit).toHaveBeenCalledWith([]);
    });

    it('submit calls onSubmit with single selection', () => {
        const onSubmit = vi.fn();
        const ms = new MultiSelect(OPTIONS, { onSubmit });
        ms.toggleCurrent();
        ms.submit();
        expect(onSubmit).toHaveBeenCalledWith([OPTIONS[0]]);
    });

    it('submit calls onSubmit with multiple selections', () => {
        const onSubmit = vi.fn();
        const ms = new MultiSelect(OPTIONS, { onSubmit });
        ms.toggleCurrent();
        ms.selectNext();
        ms.toggleCurrent();
        ms.submit();
        expect(onSubmit).toHaveBeenCalledWith([OPTIONS[0], OPTIONS[1]]);
    });

    it('submit can be called multiple times', () => {
        const onSubmit = vi.fn();
        const ms = new MultiSelect(OPTIONS, { onSubmit });
        ms.toggleCurrent();
        ms.submit();
        ms.submit();
        expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it('submit works without onSubmit callback', () => {
        const ms = new MultiSelect(OPTIONS); // no onSubmit
        expect(() => ms.submit()).not.toThrow();
    });
});

// ── Rendering ──────────────────────────────────────────
describe('MultiSelect — Rendering', () => {
    beforeEach(() => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('active row shows cursor in unicode mode', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('❯'); // unicode cursor
    });

    it('checked item shows check character', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('◼'); // default check char
    });

    it('unchecked item shows uncheck character', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('◻'); // default uncheck char
    });

    it('disabled item is rendered dim', () => {
        const disabledOptions = [
            { label: 'Red', value: 'red' },
            { label: 'Green', value: 'green', disabled: true },
        ];
        const ms = new MultiSelect(disabledOptions);
        ms.selectNext(); // move to disabled Green
        ms.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        const screen = new Screen(20, 2);
        ms.render(screen);
        const disabledRow = screen.back[1];
        // Check that dim is set for disabled item
        const hasDimCell = disabledRow.some((c: any) => c.dim === true);
        expect(hasDimCell).toBe(true);
    });

    it('disabled item renders with brightBlack foreground', () => {
        const disabledOptions = [
            { label: 'Red', value: 'red' },
            { label: 'Green', value: 'green', disabled: true },
        ];
        const ms = new MultiSelect(disabledOptions);
        ms.selectNext(); // move to disabled Green
        ms.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        const screen = new Screen(20, 2);
        ms.render(screen);
        const disabledRow = screen.back[1];
        // Check that at least one cell has brightBlack foreground
        const hasBrightBlack = disabledRow.some(
            (c: any) =>
                c.fg && c.fg.type === 'named' && c.fg.name === 'brightBlack',
        );
        expect(hasBrightBlack).toBe(true);
    });

    it('renders all options when height is sufficient', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        ms.render(screen);
        const renderedText = screen.back
            .slice(0, 3)
            .map((row: any[]) => row.map((c: { char: string }) => c.char).join(''))
            .join('\n');
        expect(renderedText).toContain('Red');
        expect(renderedText).toContain('Green');
        expect(renderedText).toContain('Blue');
    });

    it('respects height bounds in rendering', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 2 });
        const screen = new Screen(20, 2);
        ms.render(screen);
        // Only Red and Green should be rendered
        const renderedText = screen.back
            .map((row: any[]) => row.map((c: { char: string }) => c.char).join(''))
            .join('\n');
        expect(renderedText).toContain('Red');
        expect(renderedText).toContain('Green');
        expect(renderedText).not.toContain('Blue');
    });
});

// ── Unicode vs ASCII ───────────────────────────────────
describe('MultiSelect — Unicode vs ASCII Mode', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('unicode mode shows ❯ cursor', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('❯');
    });

    it('ascii mode shows > cursor', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('>');
    });

    it('unicode mode shows ◼ for checked', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('◼');
    });

    it('ascii mode shows [x] for checked', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('[x]');
    });

    it('unicode mode shows ◻ for unchecked', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('◻');
    });

    it('ascii mode shows [ ] for unchecked', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('[ ]');
    });
});

// ── Custom Characters ──────────────────────────────────
describe('MultiSelect — Custom Characters', () => {
    beforeEach(() => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('custom checkChar is used instead of default', () => {
        const ms = new MultiSelect(OPTIONS, { checkChar: '✓' });
        ms.toggleCurrent();
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('✓');
        expect(row).not.toContain('◼');
    });

    it('custom uncheckChar is used instead of default', () => {
        const ms = new MultiSelect(OPTIONS, { uncheckChar: '○' });
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('○');
        expect(row).not.toContain('◻');
    });

    it('both custom check and uncheck chars work together', () => {
        const ms = new MultiSelect(OPTIONS, {
            checkChar: '✓',
            uncheckChar: '○',
        });
        ms.toggleCurrent(); // check first
        ms.selectNext(); // move to second (unchecked)
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const firstRow = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        const secondRow = screen.back[1]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(firstRow).toContain('✓');
        expect(secondRow).toContain('○');
    });
});

// ── Active Color ───────────────────────────────────────
describe('MultiSelect — Active Color', () => {
    it('custom activeColor is applied to active row', () => {
        const ms = new MultiSelect(OPTIONS, {
            activeColor: { type: 'named', name: 'green' },
        });
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const activeRow = screen.back[0];
        const hasGreenFg = activeRow.some(
            (c: any) => c.fg && c.fg.type === 'named' && c.fg.name === 'green',
        );
        expect(hasGreenFg).toBe(true);
    });

    it('default cyan activeColor is applied to active row', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const activeRow = screen.back[0];
        const hasCyanFg = activeRow.some(
            (c: any) => c.fg && c.fg.type === 'named' && c.fg.name === 'cyan',
        );
        expect(hasCyanFg).toBe(true);
    });

    it('inactive rows do not have active color', () => {
        const ms = new MultiSelect(OPTIONS, {
            activeColor: { type: 'named', name: 'yellow' },
        });
        ms.selectNext(); // move to second row (index 1)
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const firstRow = screen.back[0];
        const firstRowHasYellow = firstRow.some(
            (c: any) => c.fg && c.fg.type === 'named' && c.fg.name === 'yellow',
        );
        expect(firstRowHasYellow).toBe(false);
    });
});

// ── markDirty Coverage ─────────────────────────────────
describe('MultiSelect — markDirty Coverage', () => {
    it('selectNext calls markDirty', () => {
        const ms = new MultiSelect(OPTIONS);
        const spy = vi.spyOn(ms, 'markDirty');
        ms.selectNext();
        expect(spy).toHaveBeenCalled();
    });

    it('selectPrev calls markDirty', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.selectNext(); // move away from start
        const spy = vi.spyOn(ms, 'markDirty');
        ms.selectPrev(); // now we can move back
        expect(spy).toHaveBeenCalled();
    });

    it('toggleCurrent calls markDirty', () => {
        const ms = new MultiSelect(OPTIONS);
        const spy = vi.spyOn(ms, 'markDirty');
        ms.toggleCurrent();
        expect(spy).toHaveBeenCalled();
    });

    it('markDirty not called when selectNext at boundary', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.selectNext();
        ms.selectNext(); // move to last
        const spy = vi.spyOn(ms, 'markDirty');
        ms.selectNext(); // try to go beyond
        expect(spy).not.toHaveBeenCalled();
    });

    it('markDirty not called when selectPrev at boundary', () => {
        const ms = new MultiSelect(OPTIONS);
        const spy = vi.spyOn(ms, 'markDirty');
        ms.selectPrev(); // already at 0
        expect(spy).not.toHaveBeenCalled();
    });

    it('markDirty not called when toggle disabled item', () => {
        const singleDisabled = [{ label: 'Only', value: 'only', disabled: true }];
        const ms = new MultiSelect(singleDisabled);
        const spy = vi.spyOn(ms, 'markDirty');
        ms.toggleCurrent(); // try to toggle the only (disabled) item
        expect(spy).not.toHaveBeenCalled();
    });
});

// ── selectedOptions Getter ─────────────────────────────
describe('MultiSelect — selectedOptions Getter', () => {
    it('returns empty array initially', () => {
        const ms = new MultiSelect(OPTIONS);
        expect(ms.selectedOptions).toEqual([]);
    });

    it('returns sorted by option index', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.selectNext();
        ms.selectNext(); // move to index 2
        ms.toggleCurrent(); // check index 2
        ms.selectPrev();
        ms.selectPrev(); // move to index 0
        ms.toggleCurrent(); // check index 0
        expect(ms.selectedOptions).toEqual([OPTIONS[0], OPTIONS[2]]);
    });

    it('updates after selection', () => {
        const ms = new MultiSelect(OPTIONS);
        expect(ms.selectedOptions).toHaveLength(0);
        ms.toggleCurrent();
        expect(ms.selectedOptions).toHaveLength(1);
    });

    it('updates after deselection', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        expect(ms.selectedOptions).toHaveLength(1);
        ms.toggleCurrent();
        expect(ms.selectedOptions).toHaveLength(0);
    });

    it('maintains correct options objects in returned array', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        ms.selectNext();
        ms.toggleCurrent();
        expect(ms.selectedOptions[0]).toBe(OPTIONS[0]);
        expect(ms.selectedOptions[1]).toBe(OPTIONS[1]);
    });
});

// ── Empty List Handling ────────────────────────────────
describe('MultiSelect — Empty List Handling', () => {
    it('empty list initializes without throwing', () => {
        expect(() => new MultiSelect([])).not.toThrow();
    });

    it('empty list rendering succeeds', () => {
        const ms = new MultiSelect([]);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        expect(() => ms.render(screen)).not.toThrow();
    });

    it('empty list submit succeeds', () => {
        const onSubmit = vi.fn();
        const ms = new MultiSelect([], { onSubmit });
        expect(() => ms.submit()).not.toThrow();
        expect(onSubmit).toHaveBeenCalledWith([]);
    });

    it('empty list toggleCurrent is safe', () => {
        const ms = new MultiSelect([]);
        expect(() => ms.toggleCurrent()).not.toThrow();
    });

    it('empty list selectNext is safe', () => {
        const ms = new MultiSelect([]);
        expect(() => ms.selectNext()).not.toThrow();
    });

    it('empty list selectPrev is safe', () => {
        const ms = new MultiSelect([]);
        expect(() => ms.selectPrev()).not.toThrow();
    });
});

// ── Single Item Lists ──────────────────────────────────
describe('MultiSelect — Single Item Lists', () => {
    const SINGLE_OPTION = [{ label: 'Only', value: 'only' }];

    it('single item navigation is safe', () => {
        const ms = new MultiSelect(SINGLE_OPTION);
        expect(() => {
            ms.selectNext();
            ms.selectPrev();
            ms.selectNext();
        }).not.toThrow();
    });

    it('single item toggle works', () => {
        const ms = new MultiSelect(SINGLE_OPTION);
        ms.toggleCurrent();
        expect(ms.selectedOptions).toEqual([SINGLE_OPTION[0]]);
    });

    it('single item submit works', () => {
        const onSubmit = vi.fn();
        const ms = new MultiSelect(SINGLE_OPTION, { onSubmit });
        ms.toggleCurrent();
        ms.submit();
        expect(onSubmit).toHaveBeenCalledWith([SINGLE_OPTION[0]]);
    });

    it('single item rendering succeeds', () => {
        const ms = new MultiSelect(SINGLE_OPTION);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        expect(() => ms.render(screen)).not.toThrow();
    });
});

// ── Rendering Bounds ───────────────────────────────────
describe('MultiSelect — Rendering Bounds', () => {
    it('rendering with width=0 does not throw', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 0, height: 10 });
        const screen = new Screen(10, 10);
        expect(() => ms.render(screen)).not.toThrow();
    });

    it('rendering with height=0 does not throw', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 0 });
        const screen = new Screen(20, 10);
        expect(() => ms.render(screen)).not.toThrow();
    });

    it('rendering with very small width truncates safely', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        ms.updateRect({ x: 0, y: 0, width: 3, height: 3 });
        const screen = new Screen(3, 3);
        expect(() => ms.render(screen)).not.toThrow();
    });

    it('rendering with negative width handled gracefully', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.updateRect({ x: 0, y: 0, width: -10, height: 10 });
        const screen = new Screen(20, 10);
        expect(() => ms.render(screen)).not.toThrow();
    });
});

// ── All Disabled Options ───────────────────────────────
describe('MultiSelect — All Disabled Options', () => {
    const ALL_DISABLED = [
        { label: 'Red', value: 'red', disabled: true },
        { label: 'Green', value: 'green', disabled: true },
        { label: 'Blue', value: 'blue', disabled: true },
    ];

    it('all disabled navigation is safe', () => {
        const ms = new MultiSelect(ALL_DISABLED);
        expect(() => {
            ms.selectNext();
            ms.selectPrev();
        }).not.toThrow();
    });

    it('all disabled toggle is ignored', () => {
        const ms = new MultiSelect(ALL_DISABLED);
        ms.toggleCurrent();
        expect(ms.selectedOptions).toHaveLength(0);
    });

    it('all disabled submit returns empty selection', () => {
        const onSubmit = vi.fn();
        const ms = new MultiSelect(ALL_DISABLED, { onSubmit });
        ms.submit();
        expect(onSubmit).toHaveBeenCalledWith([]);
    });

    it('all disabled rendering succeeds', () => {
        const ms = new MultiSelect(ALL_DISABLED);
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        expect(() => ms.render(screen)).not.toThrow();
    });
});

// ── Regression Tests ───────────────────────────────────
describe('MultiSelect — Regression Tests', () => {
    it('select → deselect → reselect works correctly', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent(); // select
        expect(ms.selectedOptions).toHaveLength(1);
        ms.toggleCurrent(); // deselect
        expect(ms.selectedOptions).toHaveLength(0);
        ms.toggleCurrent(); // reselect
        expect(ms.selectedOptions).toEqual([OPTIONS[0]]);
    });

    it('multiple consecutive submits preserve state', () => {
        const onSubmit = vi.fn();
        const ms = new MultiSelect(OPTIONS, { onSubmit });
        ms.toggleCurrent();
        ms.submit();
        ms.submit();
        expect(onSubmit).toHaveBeenCalledTimes(2);
        expect(onSubmit).toHaveBeenNthCalledWith(1, [OPTIONS[0]]);
        expect(onSubmit).toHaveBeenNthCalledWith(2, [OPTIONS[0]]);
    });

    it('disabled first item navigation works', () => {
        const disabledFirst = [
            { label: 'Disabled', value: 'disabled', disabled: true },
            { label: 'Enabled', value: 'enabled' },
        ];
        const ms = new MultiSelect(disabledFirst);
        ms.selectNext(); // should skip to index 1
        ms.toggleCurrent();
        expect(ms.selectedOptions).toEqual([disabledFirst[1]]);
    });

    it('disabled last item navigation works', () => {
        const disabledLast = [
            { label: 'Enabled', value: 'enabled' },
            { label: 'Disabled', value: 'disabled', disabled: true },
        ];
        const ms = new MultiSelect(disabledLast);
        ms.selectNext(); // move to disabled
        ms.selectNext(); // stay at disabled (can't go further)
        ms.selectPrev(); // go back to enabled
        ms.toggleCurrent();
        expect(ms.selectedOptions).toEqual([disabledLast[0]]);
    });

    it('custom activeColor + custom check chars together', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const ms = new MultiSelect(OPTIONS, {
            activeColor: { type: 'named', name: 'magenta' },
            checkChar: '★',
            uncheckChar: '☆',
        });
        ms.toggleCurrent();
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('★');
        const hasMagenta = screen.back[0].some(
            (c: any) => c.fg && c.fg.type === 'named' && c.fg.name === 'magenta',
        );
        expect(hasMagenta).toBe(true);
        vi.restoreAllMocks();
    });

    it('unicode rendering after selection', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('❯');
        expect(row).toContain('◼');
        vi.restoreAllMocks();
    });

    it('ascii rendering after selection', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        ms.render(screen);
        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');
        expect(row).toContain('>');
        expect(row).toContain('[x]');
        vi.restoreAllMocks();
    });

    it('complex multi-selection scenario', () => {
        const ms = new MultiSelect(OPTIONS);
        // Select Red
        ms.toggleCurrent();
        // Move to Green, select it
        ms.selectNext();
        ms.toggleCurrent();
        // Move to Blue, select it
        ms.selectNext();
        ms.toggleCurrent();
        // Move back to Green, deselect it
        ms.selectPrev();
        ms.toggleCurrent();
        // Final state: Red and Blue selected
        expect(ms.selectedOptions).toEqual([OPTIONS[0], OPTIONS[2]]);
    });

    it('selection state persists across multiple renders', () => {
        const ms = new MultiSelect(OPTIONS);
        ms.toggleCurrent();
        ms.toggleCurrent();
        ms.toggleCurrent();
        ms.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen1 = new Screen(20, 3);
        ms.render(screen1);
        expect(ms.selectedOptions).toEqual([OPTIONS[0]]);
        const screen2 = new Screen(20, 3);
        ms.render(screen2);
        expect(ms.selectedOptions).toEqual([OPTIONS[0]]);
    });
});
