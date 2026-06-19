import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps, createKeyEvent } from '@termuijs/core';
import { TagInput } from './TagInput.js';

/** Helper to build a KeyEvent with sensible defaults. */
function key(k: string, mods: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}): ReturnType<typeof createKeyEvent> {
    return createKeyEvent({
        key: k,
        raw: Buffer.from(k),
        ctrl: mods.ctrl ?? false,
        alt: mods.alt ?? false,
        shift: mods.shift ?? false,
    });
}

/** Render a TagInput into a fresh Screen and return all rows as a single string. */
function renderToString(ti: TagInput, w = 40, h = 3): string {
    const screen = new Screen(w, h);
    ti.updateRect({ x: 0, y: 0, width: w, height: h });
    ti.render(screen);
    return screen.back.map(r => r.map(c => c.char).join('')).join('\n');
}

describe('TagInput', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders default tags', () => {
        const ti = new TagInput({}, { defaultTags: ['react'] });
        const output = renderToString(ti, 30, 3);
        expect(output).toContain('react');
        expect(ti.tags).toEqual(['react']);
    });

    it('typing then enter commits a chip', () => {
        const ti = new TagInput();

        ti.handleKey(key('h'));
        ti.handleKey(key('i'));
        ti.handleKey(key('enter'));

        expect(ti.tags).toEqual(['hi']);

        const output = renderToString(ti);
        expect(output).toContain('hi');
    });

    it('backspace on empty draft removes the last chip', () => {
        const ti = new TagInput({}, { defaultTags: ['alpha', 'beta'] });
        expect(ti.tags).toEqual(['alpha', 'beta']);

        // Draft is empty, so backspace removes the last chip
        ti.handleKey(key('backspace'));
        expect(ti.tags).toEqual(['alpha']);

        ti.handleKey(key('backspace'));
        expect(ti.tags).toEqual([]);
    });

    it('backspace on non-empty draft deletes draft character', () => {
        const ti = new TagInput({}, { defaultTags: ['keep'] });

        ti.handleKey(key('a'));
        ti.handleKey(key('b'));
        ti.handleKey(key('backspace'));

        // Draft should be 'a', not removing a chip
        expect(ti.tags).toEqual(['keep']);

        ti.handleKey(key('enter'));
        expect(ti.tags).toEqual(['keep', 'a']);
    });

    it('placeholder renders when empty', () => {
        const ti = new TagInput({}, { placeholder: 'Add tags...' });
        const output = renderToString(ti);
        expect(output).toContain('Add tags...');
    });

    it('placeholder does not render when tags exist', () => {
        const ti = new TagInput({}, { placeholder: 'Add tags...', defaultTags: ['foo'] });
        const output = renderToString(ti);
        expect(output).not.toContain('Add tags...');
        expect(output).toContain('foo');
    });

    it('onChange fires on tag list changes', () => {
        const changes: string[][] = [];
        const ti = new TagInput({}, { onChange: (tags) => changes.push(tags) });

        // Type and commit
        ti.handleKey(key('a'));
        ti.handleKey(key('enter'));
        expect(changes).toHaveLength(1);
        expect(changes[0]).toEqual(['a']);

        // Type and commit another
        ti.handleKey(key('b'));
        ti.handleKey(key('enter'));
        expect(changes).toHaveLength(2);
        expect(changes[1]).toEqual(['a', 'b']);

        // Remove last via backspace
        ti.handleKey(key('backspace'));
        expect(changes).toHaveLength(3);
        expect(changes[2]).toEqual(['a']);
    });

    it('does not commit empty or whitespace-only draft', () => {
        const ti = new TagInput();

        // Enter on empty draft should not add a tag
        ti.handleKey(key('enter'));
        expect(ti.tags).toEqual([]);

        // Spaces only
        ti.handleKey(key(' '));
        ti.handleKey(key(' '));
        ti.handleKey(key('enter'));
        expect(ti.tags).toEqual([]);
    });

    it('addTag and removeLast call markDirty', () => {
        const ti = new TagInput();
        const spy = vi.spyOn(ti, 'markDirty');

        ti.addTag('test');
        expect(spy).toHaveBeenCalled();

        spy.mockClear();

        ti.removeLast();
        expect(spy).toHaveBeenCalled();
    });

    it('ASCII fallback chip renders when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const ti = new TagInput({}, { defaultTags: ['node'] });
        const output = renderToString(ti, 30, 3);

        // ASCII fallback uses square brackets
        expect(output).toContain('[node]');
    });

    it('unicode chip renders when caps.unicode is true', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const ti = new TagInput({}, { defaultTags: ['bun'] });
        const output = renderToString(ti, 30, 3);

        // Unicode uses angle quotes
        expect(output).toContain('\u2039bun\u203a');
    });

    it('tags getter returns a copy, not a reference', () => {
        const ti = new TagInput({}, { defaultTags: ['a'] });
        const ref = ti.tags;
        ref.push('b');
        expect(ti.tags).toEqual(['a']);
    });

    it('does not react to ctrl or alt modified keys', () => {
        const ti = new TagInput();
        ti.handleKey(key('a', { ctrl: true }));
        ti.handleKey(key('b', { alt: true }));
        ti.handleKey(key('enter'));
        // No characters should have been added to draft
        expect(ti.tags).toEqual([]);
    });
});
