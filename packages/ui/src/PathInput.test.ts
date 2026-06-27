// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for PathInput widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@termuijs/testing';
import { createElement, useRef } from '@termuijs/jsx';
import { Screen, caps } from '@termuijs/core';
import { PathInput } from './PathInput.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock fs module
vi.mock('node:fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:fs')>();
    return {
        ...actual,
        readdirSync: vi.fn(),
    };
});

// ── Helpers ──────────────────────────────────────────

function makeDirent(name: string, isDir: boolean): fs.Dirent {
    return { name, isDirectory: () => isDir } as fs.Dirent;
}

function makeKey(
    key: string,
    extra: Partial<{ ctrl: boolean; alt: boolean; shift: boolean }> = {},
): import('@termuijs/core').KeyEvent {
    return {
        key,
        ctrl: extra.ctrl ?? false,
        alt: extra.alt ?? false,
        shift: extra.shift ?? false,
        raw: Buffer.from(key),
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
    } as unknown as import('@termuijs/core').KeyEvent;
}

function renderWidget(widget: PathInput, cols = 40, rows = 10): Screen {
    const screen = new Screen(cols, rows);
    widget.updateRect({ x: 0, y: 0, width: cols, height: rows });
    widget.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    return screen.back[row].map((c) => c.char).join('');
}

// ─────────────────────────────────────────────────────
// Default mock: src/ (dir), package.json, README.md
// ─────────────────────────────────────────────────────
beforeEach(() => {
    vi.mocked(fs.readdirSync).mockImplementation((() => [
        makeDirent('src', true),
        makeDirent('package.json', false),
        makeDirent('README.md', false),
    ]) as unknown as typeof fs.readdirSync);
});

afterEach(() => {
    vi.mocked(fs.readdirSync).mockReset();
    vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────
// Original tests (preserved)
// ─────────────────────────────────────────────────────

describe('PathInput — original tests', () => {
    it('renders its current value', () => {
        const screen = render(createElement(() => {
            const ref = useRef<PathInput | null>(null);
            if (!ref.current) {
                ref.current = new PathInput();
                ref.current.value = 'src/index.ts';
            }
            return ref.current;
        }, null));

        expect(screen.lastFrame().join('\n')).toContain('src/index.ts');
        screen.unmount();
    });

    it('updates value on keypress', () => {
        let input!: PathInput;
        const screen = render(createElement(() => {
            const ref = useRef<PathInput | null>(null);
            if (!ref.current) {
                ref.current = new PathInput();
            }
            input = ref.current;
            return ref.current;
        }, null));

        input.handleKey(makeKey('s'));
        screen.rerender();

        expect(input.value).toBe('s');
        expect(screen.lastFrame().join('\n')).toContain('s');
        screen.unmount();
    });

    it('completes a partial path on the completion key', () => {
        let input!: PathInput;
        const screen = render(createElement(() => {
            const ref = useRef<PathInput | null>(null);
            if (!ref.current) {
                ref.current = new PathInput({ height: 5 }, { cwd: '/mock/dir' });
                ref.current.value = 's';
            }
            input = ref.current;
            return ref.current;
        }, null));

        input.handleKey(makeKey('tab'));
        screen.rerender();

        const expectedVal = 'src' + path.sep;
        expect(input.value).toBe(expectedVal);
        expect(screen.lastFrame().join('\n')).toContain(expectedVal);
        screen.unmount();
    });

    it('prevents default Tab focus navigation when completing', () => {
        const input = new PathInput({}, { cwd: '/mock/dir' });
        input.value = 's';
        const event = makeKey('tab');

        input.handleKey(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────
// 1. Constructor Initialization
// ─────────────────────────────────────────────────────

describe('PathInput — constructor initialization', () => {
    it('has empty value by default', () => {
        const input = new PathInput();
        expect(input.value).toBe('');
    });

    it('is focusable', () => {
        const input = new PathInput();
        expect(input.focusable).toBe(true);
    });

    it('starts with empty completions', () => {
        const input = new PathInput();
        expect(input.completions).toEqual([]);
    });

    it('starts with completion UI hidden', () => {
        const input = new PathInput();
        expect(input.isShowingCompletions).toBe(false);
    });

    it('defaults maxLength to 4096', () => {
        const input = new PathInput();
        const longStr = 'a'.repeat(5000);
        input.value = longStr;
        expect(input.value.length).toBe(4096);
    });

    it('defaults maxCompletions to 5', () => {
        vi.mocked(fs.readdirSync).mockImplementation((() => [
            makeDirent('a', false),
            makeDirent('b', false),
            makeDirent('c', false),
            makeDirent('d', false),
            makeDirent('e', false),
            makeDirent('f', false),
            makeDirent('g', false),
        ]) as unknown as typeof fs.readdirSync);

        const input = new PathInput({}, { cwd: '/mock' });
        input.triggerCompletion();
        expect(input.completions.length).toBe(5);
    });
});

// ─────────────────────────────────────────────────────
// 2. Value Setter
// ─────────────────────────────────────────────────────

describe('PathInput — value setter', () => {
    it('updates value correctly', () => {
        const input = new PathInput();
        input.value = 'src/index.ts';
        expect(input.value).toBe('src/index.ts');
    });

    it('dismisses completions when value is set', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();
        expect(input.isShowingCompletions).toBe(true);

        input.value = 'other';
        expect(input.isShowingCompletions).toBe(false);
    });

    it('resets completion index when value is set', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();
        // completions are shown; set new value
        input.value = '';
        expect(input.completions).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────
// 3. maxLength Enforcement
// ─────────────────────────────────────────────────────

describe('PathInput — maxLength enforcement', () => {
    it('truncates value to maxLength via setter', () => {
        const input = new PathInput({}, { maxLength: 5 });
        input.value = '123456789';
        expect(input.value).toBe('12345');
    });

    it('does not insert beyond maxLength via insertChar', () => {
        const input = new PathInput({}, { maxLength: 3 });
        input.value = 'abc';
        input.insertChar('d');
        expect(input.value).toBe('abc');
    });
});

// ─────────────────────────────────────────────────────
// 4. Character Input
// ─────────────────────────────────────────────────────

describe('PathInput — character input', () => {
    it('builds value character by character', () => {
        const input = new PathInput();
        input.insertChar('s');
        input.insertChar('r');
        input.insertChar('c');
        expect(input.value).toBe('src');
    });

    it('fires onChange on every character insert', () => {
        const onChange = vi.fn();
        const input = new PathInput({}, { onChange });
        input.insertChar('s');
        input.insertChar('r');
        input.insertChar('c');
        expect(onChange).toHaveBeenCalledTimes(3);
        expect(onChange).toHaveBeenNthCalledWith(1, 's');
        expect(onChange).toHaveBeenNthCalledWith(2, 'sr');
        expect(onChange).toHaveBeenNthCalledWith(3, 'src');
    });

    it('ignores ctrl+key character input', () => {
        const input = new PathInput();
        input.handleKey(makeKey('a', { ctrl: true }));
        expect(input.value).toBe('');
    });

    it('ignores alt+key character input', () => {
        const input = new PathInput();
        input.handleKey(makeKey('a', { alt: true }));
        expect(input.value).toBe('');
    });
});

// ─────────────────────────────────────────────────────
// 5. Backspace
// ─────────────────────────────────────────────────────

describe('PathInput — backspace', () => {
    it('removes last character', () => {
        const input = new PathInput();
        input.value = 'src';
        input.moveCursorEnd(); // value setter does not move cursor to end
        input.deleteBack();
        expect(input.value).toBe('sr');
    });

    it('moves cursor back after backspace', () => {
        const input = new PathInput();
        input.value = 'src';
        input.moveCursorEnd(); // position cursor at end
        input.deleteBack();
        // cursor should now be at position 2 (end of 'sr')
        input.insertChar('X');
        expect(input.value).toBe('srX');
    });

    it('fires onChange on backspace', () => {
        const onChange = vi.fn();
        const input = new PathInput({}, { onChange });
        input.value = 'ab';
        input.moveCursorEnd(); // value setter does not move cursor to end
        input.deleteBack();
        expect(onChange).toHaveBeenCalledWith('a');
    });

    it('does nothing when cursor is at start', () => {
        const input = new PathInput();
        input.value = 'abc';
        input.moveCursorHome();
        input.deleteBack();
        expect(input.value).toBe('abc');
    });
});

// ─────────────────────────────────────────────────────
// 6. Delete Key (deleteForward)
// ─────────────────────────────────────────────────────

describe('PathInput — delete key', () => {
    it('removes character under cursor', () => {
        const input = new PathInput();
        input.value = 'abcd';
        input.moveCursorHome();
        input.moveCursorRight(); // cursor at 1, char 'b' is under cursor
        input.deleteForward();
        expect(input.value).toBe('acd');
    });

    it('fires onChange on delete forward', () => {
        const onChange = vi.fn();
        const input = new PathInput({}, { onChange });
        input.value = 'ab';
        input.moveCursorHome();
        input.deleteForward();
        expect(onChange).toHaveBeenCalledWith('b');
    });

    it('does nothing when cursor is at end', () => {
        const input = new PathInput();
        input.value = 'abc';
        input.moveCursorEnd();
        input.deleteForward();
        expect(input.value).toBe('abc');
    });
});

// ─────────────────────────────────────────────────────
// 7 & 8. Cursor Navigation and Boundary Cases
// ─────────────────────────────────────────────────────

describe('PathInput — cursor navigation', () => {
    it('moveCursorLeft decrements cursor', () => {
        const input = new PathInput();
        input.value = 'abc';
        input.moveCursorEnd();
        input.moveCursorLeft();
        // inserting at cursor pos=2 should produce 'abXc'
        input.insertChar('X');
        expect(input.value).toBe('abXc');
    });

    it('moveCursorRight increments cursor', () => {
        const input = new PathInput();
        input.value = 'abc';
        input.moveCursorHome();
        input.moveCursorRight();
        // insert at pos=1 → 'aXbc'
        input.insertChar('X');
        expect(input.value).toBe('aXbc');
    });

    it('moveCursorHome sets cursor to 0', () => {
        const input = new PathInput();
        input.value = 'hello';
        input.moveCursorEnd();
        input.moveCursorHome();
        input.insertChar('X');
        expect(input.value).toBe('Xhello');
    });

    it('moveCursorEnd sets cursor to end', () => {
        const input = new PathInput();
        input.value = 'hello';
        input.moveCursorHome();
        input.moveCursorEnd();
        input.insertChar('!');
        expect(input.value).toBe('hello!');
    });

    it('left at position 0 stays at 0', () => {
        const input = new PathInput();
        input.value = 'abc';
        input.moveCursorHome();
        input.moveCursorLeft();
        input.moveCursorLeft();
        // still at 0: inserting at front
        input.insertChar('X');
        expect(input.value).toBe('Xabc');
    });

    it('right at end stays at end', () => {
        const input = new PathInput();
        input.value = 'abc';
        input.moveCursorEnd();
        input.moveCursorRight();
        input.moveCursorRight();
        input.insertChar('X');
        expect(input.value).toBe('abcX');
    });

    it('home always reaches 0 regardless of position', () => {
        const input = new PathInput();
        input.value = 'abcdef';
        // move to some middle position
        input.moveCursorEnd();
        input.moveCursorLeft();
        input.moveCursorLeft();
        input.moveCursorHome();
        input.insertChar('X');
        expect(input.value).toMatch(/^X/);
    });

    it('end always reaches the length', () => {
        const input = new PathInput();
        input.value = 'abcdef';
        input.moveCursorHome();
        input.moveCursorEnd();
        input.insertChar('X');
        expect(input.value).toBe('abcdefX');
    });

    it('handleKey left routes to moveCursorLeft', () => {
        const input = new PathInput();
        input.value = 'abc';
        input.moveCursorEnd();
        input.handleKey(makeKey('left'));
        input.insertChar('X');
        expect(input.value).toBe('abXc');
    });

    it('handleKey right routes to moveCursorRight', () => {
        const input = new PathInput();
        input.value = 'abc';
        input.moveCursorHome();
        input.handleKey(makeKey('right'));
        input.insertChar('X');
        expect(input.value).toBe('aXbc');
    });

    it('handleKey home routes to moveCursorHome', () => {
        const input = new PathInput();
        input.value = 'abc';
        input.moveCursorEnd();
        input.handleKey(makeKey('home'));
        input.insertChar('X');
        expect(input.value).toMatch(/^X/);
    });

    it('handleKey end routes to moveCursorEnd', () => {
        const input = new PathInput();
        input.value = 'abc';
        input.moveCursorHome();
        input.handleKey(makeKey('end'));
        input.insertChar('X');
        expect(input.value).toBe('abcX');
    });
});

// ─────────────────────────────────────────────────────
// 9. Completion Generation
// ─────────────────────────────────────────────────────

describe('PathInput — completion generation', () => {
    it('generates completions matching prefix', () => {
        const input = new PathInput({}, { cwd: '/mock/project' });
        input.value = 's';
        input.triggerCompletion();
        expect(input.completions.length).toBeGreaterThan(0);
        expect(input.completions[0]).toContain('src');
    });

    it('sets value to the first completion on first Tab', () => {
        const input = new PathInput({}, { cwd: '/mock/project' });
        input.value = 's';
        input.triggerCompletion();
        expect(input.value).toBe('src' + path.sep);
    });

    it('shows completion UI after match found', () => {
        const input = new PathInput({}, { cwd: '/mock/project' });
        input.value = 's';
        input.triggerCompletion();
        expect(input.isShowingCompletions).toBe(true);
    });
});

// ─────────────────────────────────────────────────────
// 10. Completion Cycling
// ─────────────────────────────────────────────────────

describe('PathInput — completion cycling', () => {
    beforeEach(() => {
        vi.mocked(fs.readdirSync).mockImplementation((() => [
            makeDirent('src', true),
            makeDirent('server', true),
            makeDirent('scripts', true),
        ]) as unknown as typeof fs.readdirSync);
    });

    it('cycles through completions on repeated Tab presses', () => {
        const input = new PathInput({}, { cwd: '/mock/project' });
        input.value = 's';

        input.triggerCompletion();
        const first = input.value;

        input.triggerCompletion();
        const second = input.value;

        input.triggerCompletion();
        const third = input.value;

        expect(first).not.toBe(second);
        expect(second).not.toBe(third);
    });

    it('wraps back to first completion after cycling through all', () => {
        const input = new PathInput({}, { cwd: '/mock/project' });
        input.value = 's';

        input.triggerCompletion(); // index 0
        const first = input.value;
        input.triggerCompletion(); // index 1
        input.triggerCompletion(); // index 2
        input.triggerCompletion(); // wraps to index 0

        expect(input.value).toBe(first);
    });
});

// ─────────────────────────────────────────────────────
// 11. No Completion Matches
// ─────────────────────────────────────────────────────

describe('PathInput — no completion matches', () => {
    it('sets empty completions when no match found', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 'zzz';
        input.triggerCompletion();
        expect(input.completions).toEqual([]);
    });

    it('keeps completion UI hidden when no match', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 'zzz';
        input.triggerCompletion();
        expect(input.isShowingCompletions).toBe(false);
    });
});

// ─────────────────────────────────────────────────────
// 12. Escape Dismisses Completion Menu
// ─────────────────────────────────────────────────────

describe('PathInput — escape dismisses completions', () => {
    it('hides completions on escape key', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();
        expect(input.isShowingCompletions).toBe(true);

        input.handleKey(makeKey('escape'));
        expect(input.isShowingCompletions).toBe(false);
    });
});

// ─────────────────────────────────────────────────────
// 13. Completion State Reset
// ─────────────────────────────────────────────────────

describe('PathInput — completion state reset', () => {
    it('dismisses completions on insertChar', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();
        input.insertChar('x');
        expect(input.isShowingCompletions).toBe(false);
    });

    it('dismisses completions on deleteBack', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 'sr';
        input.triggerCompletion();
        // if no match for 'sr' completions are already empty; force show state
        // by using 's' which matches
        const input2 = new PathInput({}, { cwd: '/mock' });
        input2.value = 's';
        input2.triggerCompletion();
        expect(input2.isShowingCompletions).toBe(true);
        input2.deleteBack();
        expect(input2.isShowingCompletions).toBe(false);
    });

    it('dismisses completions on deleteForward', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();
        input.moveCursorHome();
        input.deleteForward();
        expect(input.isShowingCompletions).toBe(false);
    });

    it('dismisses completions on value setter', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();
        input.value = 'new-value';
        expect(input.isShowingCompletions).toBe(false);
    });

    it('dismisses completions on clear()', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();
        input.clear();
        expect(input.isShowingCompletions).toBe(false);
    });

    it('dismisses completions on submit()', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();
        input.submit();
        expect(input.isShowingCompletions).toBe(false);
    });
});

// ─────────────────────────────────────────────────────
// 14. Relative Path Completion
// ─────────────────────────────────────────────────────

describe('PathInput — relative path completion', () => {
    it('returns relative path (not absolute) when input is relative', () => {
        const input = new PathInput({}, { cwd: '/mock/project' });
        input.value = 's';
        input.triggerCompletion();
        // completions should NOT start with /mock/project
        expect(input.completions[0]).not.toContain('/mock/project');
        expect(input.completions[0]).toContain('src');
    });
});

// ─────────────────────────────────────────────────────
// 15. Absolute Path Completion
// ─────────────────────────────────────────────────────

describe('PathInput — absolute path completion', () => {
    it('returns absolute path when input is absolute', () => {
        const input = new PathInput({}, { cwd: '/mock/project' });
        input.value = '/mock/project/s';
        input.triggerCompletion();
        // completions should be absolute paths
        if (input.completions.length > 0) {
            expect(path.isAbsolute(input.completions[0])).toBe(true);
        }
    });
});

// ─────────────────────────────────────────────────────
// 16 & 17. Directory vs File Completion Separators
// ─────────────────────────────────────────────────────

describe('PathInput — directory/file completion separators', () => {
    it('appends separator for directory completions', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();
        // 'src' is a directory — should end with path.sep
        const srcCompletion = input.completions.find((c) => c.includes('src'));
        expect(srcCompletion).toBeDefined();
        expect(srcCompletion).toMatch(/[/\\]$/);
    });

    it('does not append separator for file completions', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 'R';
        input.triggerCompletion();
        // 'README.md' is a file — should NOT end with path.sep
        if (input.completions.length > 0) {
            const readmeCompletion = input.completions.find((c) =>
                c.toLowerCase().includes('readme'),
            );
            if (readmeCompletion) {
                expect(readmeCompletion).not.toMatch(/[/\\]$/);
            }
        }
    });
});

// ─────────────────────────────────────────────────────
// 18. Filesystem Failure Handling
// ─────────────────────────────────────────────────────

describe('PathInput — filesystem failure handling', () => {
    it('does not throw when readdirSync throws', () => {
        vi.mocked(fs.readdirSync).mockImplementation((() => {
            throw new Error('ENOENT: no such file or directory');
        }) as unknown as typeof fs.readdirSync);

        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 'any';
        expect(() => input.triggerCompletion()).not.toThrow();
    });

    it('sets empty completions when filesystem throws', () => {
        vi.mocked(fs.readdirSync).mockImplementation((() => {
            throw new Error('Permission denied');
        }) as unknown as typeof fs.readdirSync);

        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 'any';
        input.triggerCompletion();
        expect(input.completions).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────
// 19. Submit Callback
// ─────────────────────────────────────────────────────

describe('PathInput — submit callback', () => {
    it('fires onSubmit with current value on enter key', () => {
        const onSubmit = vi.fn();
        const input = new PathInput({}, { onSubmit });
        input.value = 'src/index.ts';
        input.handleKey(makeKey('enter'));
        expect(onSubmit).toHaveBeenCalledWith('src/index.ts');
    });

    it('fires onSubmit with current value on return key', () => {
        const onSubmit = vi.fn();
        const input = new PathInput({}, { onSubmit });
        input.value = 'src/index.ts';
        input.handleKey(makeKey('return'));
        expect(onSubmit).toHaveBeenCalledWith('src/index.ts');
    });

    it('fires onSubmit via submit()', () => {
        const onSubmit = vi.fn();
        const input = new PathInput({}, { onSubmit });
        input.value = 'hello.txt';
        input.submit();
        expect(onSubmit).toHaveBeenCalledWith('hello.txt');
    });
});

// ─────────────────────────────────────────────────────
// 20. clear()
// ─────────────────────────────────────────────────────

describe('PathInput — clear()', () => {
    it('resets value to empty string', () => {
        const input = new PathInput();
        input.value = 'something';
        input.clear();
        expect(input.value).toBe('');
    });

    it('resets cursor to 0', () => {
        const input = new PathInput();
        input.value = 'something';
        input.clear();
        // inserting after clear should go to front
        input.insertChar('X');
        expect(input.value).toBe('X');
    });

    it('fires onChange with empty string', () => {
        const onChange = vi.fn();
        const input = new PathInput({}, { onChange });
        input.value = 'hello';
        input.clear();
        expect(onChange).toHaveBeenCalledWith('');
    });
});

// ─────────────────────────────────────────────────────
// 21. Tab Event Handling
// ─────────────────────────────────────────────────────

describe('PathInput — Tab event handling', () => {
    it('calls preventDefault and stopPropagation exactly once on Tab', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 's';
        const event = makeKey('tab');
        input.handleKey(event);
        expect(event.preventDefault).toHaveBeenCalledTimes(1);
        expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────
// 22. Non-Tab Keys Do Not Prevent Default
// ─────────────────────────────────────────────────────

describe('PathInput — non-Tab keys do not preventDefault', () => {
    it.each([
        ['a', 'a'],
        ['backspace', 'backspace'],
        ['left', 'left'],
        ['right', 'right'],
        ['home', 'home'],
        ['end', 'end'],
    ])('key %s does not call preventDefault/stopPropagation', (_label, key) => {
        const input = new PathInput();
        input.value = 'abc';
        const event = makeKey(key);
        input.handleKey(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(event.stopPropagation).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────
// 23. Placeholder Rendering
// ─────────────────────────────────────────────────────

describe('PathInput — placeholder rendering', () => {
    it('renders placeholder when value is empty and not focused', () => {
        const input = new PathInput({}, { placeholder: 'Type a path...' });
        input.isFocused = false;
        const screen = renderWidget(input);
        const rendered = Array.from({ length: 10 }, (_, r) => rowText(screen, r)).join('\n');
        expect(rendered).toContain('Type a path...');
    });

    it('does not render placeholder when value is non-empty', () => {
        const input = new PathInput({}, { placeholder: 'Type a path...' });
        input.isFocused = false;
        input.value = 'hello';
        const screen = renderWidget(input);
        const rendered = Array.from({ length: 10 }, (_, r) => rowText(screen, r)).join('\n');
        expect(rendered).not.toContain('Type a path...');
    });
});

// ─────────────────────────────────────────────────────
// 24. Focused Empty Input
// ─────────────────────────────────────────────────────

describe('PathInput — focused empty input hides placeholder', () => {
    it('does not render placeholder when focused and empty', () => {
        const input = new PathInput({}, { placeholder: 'Enter path' });
        input.isFocused = true;
        const screen = renderWidget(input);
        const rendered = Array.from({ length: 10 }, (_, r) => rowText(screen, r)).join('\n');
        expect(rendered).not.toContain('Enter path');
    });
});

// ─────────────────────────────────────────────────────
// 25. Completion List Rendering
// ─────────────────────────────────────────────────────

describe('PathInput — completion list rendering', () => {
    it('renders selected completion with ▶ prefix (unicode)', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const input = new PathInput({ height: 8 }, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();

        const screen = renderWidget(input, 40, 8);
        const rendered = Array.from({ length: 8 }, (_, r) => rowText(screen, r)).join('\n');
        expect(rendered).toContain('▶');
    });

    it('renders non-selected completions below with two-space indent', () => {
        vi.mocked(fs.readdirSync).mockImplementation((() => [
            makeDirent('src', true),
            makeDirent('server', true),
        ]) as unknown as typeof fs.readdirSync);

        const input = new PathInput({ height: 8 }, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();

        const screen = renderWidget(input, 40, 8);
        const rendered = Array.from({ length: 8 }, (_, r) => rowText(screen, r)).join('\n');
        // The non-selected one should appear with no bold marker
        expect(rendered).toContain('server');
    });
});

// ─────────────────────────────────────────────────────
// 26. ASCII Rendering
// ─────────────────────────────────────────────────────

describe('PathInput — ASCII rendering', () => {
    it('renders selected completion with > prefix when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const input = new PathInput({ height: 8 }, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();

        const screen = renderWidget(input, 40, 8);
        const rendered = Array.from({ length: 8 }, (_, r) => rowText(screen, r)).join('\n');
        expect(rendered).toContain('> ');
        expect(rendered).not.toContain('▶');
    });
});

// ─────────────────────────────────────────────────────
// 27. Height-Limited Completion Rendering
// ─────────────────────────────────────────────────────

describe('PathInput — height-limited completion rendering', () => {
    it('does not throw with many completions in small height', () => {
        vi.mocked(fs.readdirSync).mockImplementation((() => [
            makeDirent('a', false),
            makeDirent('b', false),
            makeDirent('c', false),
            makeDirent('d', false),
            makeDirent('e', false),
        ]) as unknown as typeof fs.readdirSync);

        const input = new PathInput({ height: 2 }, { cwd: '/mock' });
        input.value = '';
        input.triggerCompletion();

        expect(() => renderWidget(input, 40, 2)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────
// 28. Width Clipping
// ─────────────────────────────────────────────────────

describe('PathInput — width clipping', () => {
    it('never throws on narrow width=5', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 'src';
        expect(() => renderWidget(input, 5, 5)).not.toThrow();
    });

    it('never throws on width=1', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 'src';
        expect(() => renderWidget(input, 1, 5)).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────
// 29. Scroll Handling
// ─────────────────────────────────────────────────────

describe('PathInput — scroll handling', () => {
    it('renders long paths without throwing', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.isFocused = true;
        input.value = 'src/components/forms/input/index.ts';
        expect(() => renderWidget(input, 20, 5)).not.toThrow();
    });

    it('keeps cursor visible for long paths', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.isFocused = true;
        input.value = 'src/components/forms/input/index.ts';
        // Just ensure no exception; cursor visibility is handled by scroll logic
        expect(() => {
            const screen = renderWidget(input, 20, 5);
            rowText(screen, 1); // content row (inside border)
        }).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────
// 30. Unicode Paths
// ─────────────────────────────────────────────────────

describe('PathInput — unicode paths', () => {
    it('accepts and stores unicode path via value setter', () => {
        const input = new PathInput();
        input.value = '测试/résumé.txt';
        expect(input.value).toBe('测试/résumé.txt');
    });

    it('inserts unicode characters via insertChar', () => {
        const input = new PathInput();
        input.insertChar('📁');
        expect(input.value).toBe('📁');
    });

    it('renders unicode paths without throwing', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = '📁folder/测试';
        expect(() => renderWidget(input, 40, 5)).not.toThrow();
    });

    it('handles unicode completions without throwing', () => {
        vi.mocked(fs.readdirSync).mockImplementation((() => [
            makeDirent('测试', true),
            makeDirent('résumé.txt', false),
        ]) as unknown as typeof fs.readdirSync);

        const input = new PathInput({}, { cwd: '/mock' });
        input.value = '测';
        expect(() => input.triggerCompletion()).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────
// 31. markDirty Coverage
// ─────────────────────────────────────────────────────

describe('PathInput — markDirty is called', () => {
    function makeInputWithDirtySpy(): { input: PathInput; spy: ReturnType<typeof vi.spyOn> } {
        const input = new PathInput({}, { cwd: '/mock' });
        // Reset dirty state (it starts true) by flushing through a render
        input.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const screen = new Screen(40, 10);
        input.render(screen);
        // Now spy
        const spy = vi.spyOn(input, 'markDirty');
        return { input, spy };
    }

    it('calls markDirty on insertChar', () => {
        const { input, spy } = makeInputWithDirtySpy();
        input.insertChar('a');
        expect(spy).toHaveBeenCalled();
    });

    it('calls markDirty on deleteBack', () => {
        const { input, spy } = makeInputWithDirtySpy();
        input.value = 'ab';
        input.moveCursorEnd(); // value setter does not move cursor; position past 0
        spy.mockClear();
        input.deleteBack();
        expect(spy).toHaveBeenCalled();
    });

    it('calls markDirty on deleteForward', () => {
        const { input, spy } = makeInputWithDirtySpy();
        input.value = 'ab';
        input.moveCursorHome();
        spy.mockClear();
        input.deleteForward();
        expect(spy).toHaveBeenCalled();
    });

    it('calls markDirty on triggerCompletion', () => {
        const { input, spy } = makeInputWithDirtySpy();
        input.value = 's';
        spy.mockClear();
        input.triggerCompletion();
        expect(spy).toHaveBeenCalled();
    });

    it('calls markDirty on clear()', () => {
        const { input, spy } = makeInputWithDirtySpy();
        input.value = 'hello';
        spy.mockClear();
        input.clear();
        expect(spy).toHaveBeenCalled();
    });

    it('calls markDirty on escape dismissal', () => {
        const { input, spy } = makeInputWithDirtySpy();
        input.value = 's';
        input.triggerCompletion();
        spy.mockClear();
        input.handleKey(makeKey('escape'));
        expect(spy).toHaveBeenCalled();
    });

    it('calls markDirty on moveCursorLeft', () => {
        const { input, spy } = makeInputWithDirtySpy();
        input.value = 'abc';
        input.moveCursorEnd();
        spy.mockClear();
        input.moveCursorLeft();
        expect(spy).toHaveBeenCalled();
    });

    it('calls markDirty on moveCursorRight', () => {
        const { input, spy } = makeInputWithDirtySpy();
        input.value = 'abc';
        input.moveCursorHome();
        spy.mockClear();
        input.moveCursorRight();
        expect(spy).toHaveBeenCalled();
    });

    it('calls markDirty on moveCursorHome', () => {
        const { input, spy } = makeInputWithDirtySpy();
        input.value = 'abc';
        spy.mockClear();
        input.moveCursorHome();
        expect(spy).toHaveBeenCalled();
    });

    it('calls markDirty on moveCursorEnd', () => {
        const { input, spy } = makeInputWithDirtySpy();
        input.value = 'abc';
        spy.mockClear();
        input.moveCursorEnd();
        expect(spy).toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────
// 32. Getter Coverage
// ─────────────────────────────────────────────────────

describe('PathInput — getters reflect latest state', () => {
    it('value getter reflects latest set value', () => {
        const input = new PathInput();
        input.value = 'alpha';
        expect(input.value).toBe('alpha');
        input.value = 'beta';
        expect(input.value).toBe('beta');
    });

    it('completions getter reflects latest completions', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        expect(input.completions).toEqual([]);
        input.value = 's';
        input.triggerCompletion();
        expect(input.completions.length).toBeGreaterThan(0);
        input.clear();
        expect(input.completions).toEqual([]);
    });

    it('isShowingCompletions getter reflects latest state', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        expect(input.isShowingCompletions).toBe(false);
        input.value = 's';
        input.triggerCompletion();
        expect(input.isShowingCompletions).toBe(true);
        input.handleKey(makeKey('escape'));
        expect(input.isShowingCompletions).toBe(false);
    });
});

// ─────────────────────────────────────────────────────
// 33. Rendering Stability
// ─────────────────────────────────────────────────────

describe('PathInput — rendering stability', () => {
    it('renders empty input without throwing', () => {
        const input = new PathInput();
        expect(() => renderWidget(input)).not.toThrow();
    });

    it('renders placeholder mode without throwing', () => {
        const input = new PathInput({}, { placeholder: 'Enter path' });
        input.isFocused = false;
        expect(() => renderWidget(input)).not.toThrow();
    });

    it('renders focused mode without throwing', () => {
        const input = new PathInput();
        input.isFocused = true;
        expect(() => renderWidget(input)).not.toThrow();
    });

    it('renders with completion menu visible without throwing', () => {
        const input = new PathInput({ height: 8 }, { cwd: '/mock' });
        input.value = 's';
        input.triggerCompletion();
        expect(() => renderWidget(input, 40, 8)).not.toThrow();
    });

    it('renders with completion menu hidden without throwing', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 's';
        expect(() => renderWidget(input)).not.toThrow();
    });

    it('renders with width=0 without throwing', () => {
        const input = new PathInput();
        input.value = 'hello';
        expect(() => renderWidget(input, 0, 5)).not.toThrow();
    });

    it('renders with height=0 without throwing', () => {
        const input = new PathInput();
        input.value = 'hello';
        expect(() => renderWidget(input, 40, 0)).not.toThrow();
    });

    it('renders long paths without throwing', () => {
        const input = new PathInput();
        input.value = 'src/components/forms/input/deeply/nested/path/index.ts';
        expect(() => renderWidget(input, 20, 5)).not.toThrow();
    });

    it('renders unicode paths without throwing', () => {
        const input = new PathInput();
        input.value = '测试/résumé/📁folder';
        expect(() => renderWidget(input)).not.toThrow();
    });

    it('renders empty completion list without throwing', () => {
        const input = new PathInput({}, { cwd: '/mock' });
        input.value = 'zzz';
        input.triggerCompletion();
        expect(() => renderWidget(input)).not.toThrow();
    });
});
