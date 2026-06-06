import { afterEach, describe, it, expect, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { CheckboxGroup } from './CheckboxGroup.js';

const OPTIONS = [
    { label: 'TypeScript', value: 'ts' },
    { label: 'ESLint', value: 'lint' },
    { label: 'Prettier', value: 'prettier' },
];

/** Helper: render a CheckboxGroup onto a Screen and return row strings. */
function renderGroup(
    group: CheckboxGroup,
    width: number,
    height: number,
): string[] {
    group.updateRect({ x: 0, y: 0, width, height });
    const screen = new Screen(Math.max(width, 1), Math.max(height, 1));
    group.render(screen);
    return Array.from({ length: height }, (_, i) =>
        screen.back[i]?.map((c: { char: string }) => c.char).join('') ?? '',
    );
}

/** Helper: fire a key event. */
function pressKey(group: CheckboxGroup, key: string): void {
    group.handleKey({ key, ctrl: false, alt: false } as any);
}

describe('CheckboxGroup', () => {
    afterEach(() => vi.restoreAllMocks());

    // ── Existing tests (preserved) ────────────────────────────────────────────

    it('initial selection uses defaultValues', () => {
        const group = new CheckboxGroup({
            options: OPTIONS,
            defaultValues: ['ts'],
        });

        expect(group.selectedValues).toEqual(['ts']);
    });

    it('toggle one item', () => {
        const group = new CheckboxGroup({
            options: OPTIONS,
        });

        group.toggleCurrent();

        expect(group.selectedValues).toEqual(['ts']);
    });

    it('onChange outputs selected values', () => {
        const onChange = vi.fn();

        const group = new CheckboxGroup({
            options: OPTIONS,
            onChange,
        });

        group.toggleCurrent();

        expect(onChange).toHaveBeenCalledWith(['ts']);
    });

    // ── 1. Empty options ──────────────────────────────────────────────────────

    describe('empty options', () => {
        it('constructs without throwing', () => {
            expect(() => new CheckboxGroup({ options: [] })).not.toThrow();
        });

        it('renders without throwing', () => {
            const group = new CheckboxGroup({ options: [] });
            expect(() => renderGroup(group, 40, 5)).not.toThrow();
        });

        it('selectNext does nothing', () => {
            const group = new CheckboxGroup({ options: [] });
            expect(() => group.selectNext()).not.toThrow();
        });

        it('selectPrev does nothing', () => {
            const group = new CheckboxGroup({ options: [] });
            expect(() => group.selectPrev()).not.toThrow();
        });

        it('toggleCurrent does nothing', () => {
            const group = new CheckboxGroup({ options: [] });
            expect(() => group.toggleCurrent()).not.toThrow();
            expect(group.selectedValues).toEqual([]);
        });

        it('selectedValues is empty', () => {
            const group = new CheckboxGroup({ options: [] });
            expect(group.selectedValues).toEqual([]);
        });
    });

    // ── 2. Default values applied correctly ───────────────────────────────────

    describe('defaultValues', () => {
        it('pre-selects multiple values', () => {
            const group = new CheckboxGroup({
                options: OPTIONS,
                defaultValues: ['ts', 'prettier'],
            });

            const selected = group.selectedValues;
            expect(selected).toContain('ts');
            expect(selected).toContain('prettier');
            expect(selected).toHaveLength(2);
        });

        it('does not pre-select values not listed', () => {
            const group = new CheckboxGroup({
                options: OPTIONS,
                defaultValues: ['ts', 'prettier'],
            });

            expect(group.selectedValues).not.toContain('lint');
        });
    });

    // ── 3. Invalid default values ─────────────────────────────────────────────

    describe('invalid defaultValues', () => {
        it('valid items remain selected and unknown values are ignored', () => {
            const group = new CheckboxGroup({
                options: OPTIONS,
                defaultValues: ['ts', 'does-not-exist'],
            });

            expect(group.selectedValues).toContain('ts');
            expect(group.selectedValues).not.toContain('does-not-exist');
        });

        it('renders stably with an unknown default value', () => {
            const group = new CheckboxGroup({
                options: OPTIONS,
                defaultValues: ['ts', 'does-not-exist'],
            });

            expect(() => renderGroup(group, 40, 5)).not.toThrow();
        });
    });

    // ── 4. toggleCurrent deselects ────────────────────────────────────────────

    describe('toggleCurrent deselection', () => {
        it('toggling twice deselects the item', () => {
            const onChange = vi.fn();
            const group = new CheckboxGroup({ options: OPTIONS, onChange });

            group.toggleCurrent(); // select
            group.toggleCurrent(); // deselect

            expect(group.selectedValues).not.toContain('ts');
        });

        it('callback reflects deselection', () => {
            const onChange = vi.fn();
            const group = new CheckboxGroup({ options: OPTIONS, onChange });

            group.toggleCurrent(); // select  → ['ts']
            group.toggleCurrent(); // deselect → []

            const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[];
            expect(lastCall).not.toContain('ts');
        });
    });

    // ── 5. Multiple selections ────────────────────────────────────────────────

    describe('multiple selections', () => {
        it('retains all selected values', () => {
            const group = new CheckboxGroup({ options: OPTIONS });

            group.toggleCurrent();   // select ts (index 0)
            group.selectNext();      // move to lint (index 1)
            group.toggleCurrent();   // select lint
            group.selectNext();      // move to prettier (index 2)
            group.toggleCurrent();   // select prettier

            const selected = group.selectedValues;
            expect(selected).toContain('ts');
            expect(selected).toContain('lint');
            expect(selected).toContain('prettier');
        });

        it('callback reflects all selected values', () => {
            const onChange = vi.fn();
            const group = new CheckboxGroup({ options: OPTIONS, onChange });

            group.toggleCurrent(); // select ts
            group.selectNext();
            group.toggleCurrent(); // select lint

            const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[];
            expect(lastCall).toContain('ts');
            expect(lastCall).toContain('lint');
        });
    });

    // ── 6. Navigation down ────────────────────────────────────────────────────

    describe('selectNext (navigation down)', () => {
        it('advances focus one step', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            group.selectNext();

            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const rows = renderGroup(group, 40, 3);
            expect(rows[1]).toContain('❯');
        });

        it('does not advance past the last option', () => {
            const group = new CheckboxGroup({ options: OPTIONS });

            for (let i = 0; i < 10; i++) group.selectNext();

            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const rows = renderGroup(group, 40, 3);
            // Only the last row (index 2) should be focused.
            expect(rows[2]).toContain('❯');
            expect(rows[0]).not.toContain('❯');
            expect(rows[1]).not.toContain('❯');
        });

        it('does not throw when called many times', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            expect(() => { for (let i = 0; i < 20; i++) group.selectNext(); }).not.toThrow();
        });
    });

    // ── 7. Navigation up ──────────────────────────────────────────────────────

    describe('selectPrev (navigation up)', () => {
        it('moves focus back one step', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            group.selectNext();
            group.selectPrev();

            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const rows = renderGroup(group, 40, 3);
            expect(rows[0]).toContain('❯');
        });

        it('does not go below index 0', () => {
            const group = new CheckboxGroup({ options: OPTIONS });

            for (let i = 0; i < 10; i++) group.selectPrev();

            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const rows = renderGroup(group, 40, 3);
            expect(rows[0]).toContain('❯');
        });

        it('does not throw when called many times', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            expect(() => { for (let i = 0; i < 20; i++) group.selectPrev(); }).not.toThrow();
        });
    });

    // ── 8. Keyboard navigation ────────────────────────────────────────────────

    describe('keyboard navigation', () => {
        it('down key advances focus matching selectNext', () => {
            const a = new CheckboxGroup({ options: OPTIONS });
            const b = new CheckboxGroup({ options: OPTIONS });

            pressKey(a, 'down');
            b.selectNext();

            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const rowsA = renderGroup(a, 40, 3);
            const rowsB = renderGroup(b, 40, 3);
            expect(rowsA[1]).toContain('❯');
            expect(rowsB[1]).toContain('❯');
        });

        it('up key moves focus back matching selectPrev', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            pressKey(group, 'down');
            pressKey(group, 'down');
            pressKey(group, 'up');

            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const rows = renderGroup(group, 40, 3);
            // After down+down+up the focus should be at index 1.
            expect(rows[1]).toContain('❯');
        });
    });

    // ── 9. Space key toggles focused option ───────────────────────────────────

    describe('space key', () => {
        it('toggles the currently focused option', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            group.selectNext(); // focus 'lint'
            pressKey(group, 'space');

            expect(group.selectedValues).toContain('lint');
            expect(group.selectedValues).not.toContain('ts');
        });

        it('previously selected options remain unchanged after space on different row', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            group.toggleCurrent(); // select ts at index 0
            group.selectNext();    // move to lint
            pressKey(group, 'space'); // toggle lint

            expect(group.selectedValues).toContain('ts');
            expect(group.selectedValues).toContain('lint');
        });
    });

    // ── 10. Unsupported keys are ignored ──────────────────────────────────────

    describe('unsupported keys', () => {
        const unsupportedKeys = ['left', 'right', 'enter', 'escape', 'tab'];

        for (const key of unsupportedKeys) {
            it(`'${key}' key does not change focus or selection`, () => {
                const group = new CheckboxGroup({ options: OPTIONS });
                group.selectNext(); // focus index 1
                const selectionBefore = [...group.selectedValues];

                expect(() => pressKey(group, key)).not.toThrow();

                // Focus stays at index 1 – lint row still shows the indicator.
                vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
                const rows = renderGroup(group, 40, 3);
                expect(rows[1]).toContain('❯');
                expect(group.selectedValues).toEqual(selectionBefore);
            });
        }
    });

    // ── 11. onChange callback values ──────────────────────────────────────────

    describe('onChange callback', () => {
        it('fires with current selected values after selection', () => {
            const onChange = vi.fn();
            const group = new CheckboxGroup({ options: OPTIONS, onChange });

            group.toggleCurrent();

            expect(onChange).toHaveBeenCalledWith(['ts']);
        });

        it('fires with updated values after deselection', () => {
            const onChange = vi.fn();
            const group = new CheckboxGroup({ options: OPTIONS, onChange });

            group.toggleCurrent(); // select → ['ts']
            group.toggleCurrent(); // deselect → []

            expect(onChange).toHaveBeenLastCalledWith([]);
        });
    });

    // ── 12. Callback call count ───────────────────────────────────────────────

    describe('onChange call count', () => {
        it('fires exactly once per state change', () => {
            const onChange = vi.fn();
            const group = new CheckboxGroup({ options: OPTIONS, onChange });

            group.toggleCurrent(); // +1
            group.selectNext();
            group.toggleCurrent(); // +1
            group.toggleCurrent(); // +1 (deselect)

            expect(onChange).toHaveBeenCalledTimes(3);
        });

        it('navigation alone does not invoke the callback', () => {
            const onChange = vi.fn();
            const group = new CheckboxGroup({ options: OPTIONS, onChange });

            group.selectNext();
            group.selectNext();
            group.selectPrev();

            expect(onChange).not.toHaveBeenCalled();
        });
    });

    // ── 13. Rendering of focused option (Unicode) ─────────────────────────────

    describe('rendering – focus indicator', () => {
        it('focused row contains ❯ when unicode is enabled', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const group = new CheckboxGroup({ options: OPTIONS });
            const rows = renderGroup(group, 40, 3);

            expect(rows[0]).toContain('❯');
        });

        it('non-focused rows do not contain ❯', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

            const group = new CheckboxGroup({ options: OPTIONS });
            const rows = renderGroup(group, 40, 3);

            expect(rows[1]).not.toContain('❯');
            expect(rows[2]).not.toContain('❯');
        });
    });

    // ── 14. ASCII focus indicator ─────────────────────────────────────────────

    describe('rendering – ASCII focus indicator', () => {
        it('renders > instead of ❯ when unicode is disabled', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

            const group = new CheckboxGroup({ options: OPTIONS });
            const rows = renderGroup(group, 40, 3);

            expect(rows[0]).toContain('>');
            expect(rows[0]).not.toContain('❯');
        });
    });

    // ── 15. Checked / unchecked rendering ─────────────────────────────────────

    describe('rendering – checkbox markers', () => {
        it('selected item renders [x]', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            group.toggleCurrent(); // select ts

            const rows = renderGroup(group, 40, 3);
            expect(rows[0]).toContain('[x]');
        });

        it('unselected items render [ ]', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            // Do not select anything.

            const rows = renderGroup(group, 40, 3);
            expect(rows[0]).toContain('[ ]');
            expect(rows[1]).toContain('[ ]');
        });
    });

    // ── 16. Width clipping ────────────────────────────────────────────────────

    describe('rendering – width clipping', () => {
        it('clips output safely when width is smaller than label length', () => {
            const group = new CheckboxGroup({ options: OPTIONS });

            // 'TypeScript' label is 10 chars; total line is much longer.
            expect(() => renderGroup(group, 6, 3)).not.toThrow();
        });

        it('rendered row length does not exceed the given width', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            const width = 6;
            const rows = renderGroup(group, width, 3);

            for (const row of rows) {
                expect(row.length).toBeLessThanOrEqual(width);
            }
        });
    });

    // ── 17. Height clipping ───────────────────────────────────────────────────

    describe('rendering – height clipping', () => {
        it('renders only visible rows when height < number of options', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            // Height of 1 → only the first row should render.
            const rows = renderGroup(group, 40, 1);

            // Row 0 contains TypeScript label; rows 1+ are not in the screen buffer.
            expect(rows[0]).toContain('TypeScript');
        });

        it('does not throw when height is smaller than option count', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            expect(() => renderGroup(group, 40, 1)).not.toThrow();
        });
    });

    // ── 18. Zero width rendering ──────────────────────────────────────────────

    describe('rendering – zero width', () => {
        it('exits safely when width is 0', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            group.updateRect({ x: 0, y: 0, width: 0, height: 3 });
            const screen = new Screen(1, 3);
            expect(() => group.render(screen)).not.toThrow();
        });
    });

    // ── 19. Zero height rendering ─────────────────────────────────────────────

    describe('rendering – zero height', () => {
        it('exits safely when height is 0', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            group.updateRect({ x: 0, y: 0, width: 40, height: 0 });
            const screen = new Screen(40, 1);
            expect(() => group.render(screen)).not.toThrow();
        });
    });

    // ── 20. Focusable property ────────────────────────────────────────────────

    describe('focusable property', () => {
        it('is true', () => {
            const group = new CheckboxGroup({ options: OPTIONS });
            expect(group.focusable).toBe(true);
        });
    });

    // ── 21. selectedValues getter consistency ────────────────────────────────

    describe('selectedValues consistency', () => {
        it('reflects state accurately after mixed toggle/select/deselect operations', () => {
            const group = new CheckboxGroup({ options: OPTIONS });

            // toggle on
            group.toggleCurrent();
            expect(group.selectedValues).toContain('ts');

            // move and toggle on
            group.selectNext();
            group.toggleCurrent();
            expect(group.selectedValues).toContain('ts');
            expect(group.selectedValues).toContain('lint');

            // deselect ts
            group.selectPrev();
            group.toggleCurrent();
            expect(group.selectedValues).not.toContain('ts');
            expect(group.selectedValues).toContain('lint');

            // deselect lint
            group.selectNext();
            group.toggleCurrent();
            expect(group.selectedValues).toEqual([]);
        });
    });
});