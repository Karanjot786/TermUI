// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Autocomplete widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Screen, caps, type KeyEvent } from '@termuijs/core';
import { Autocomplete } from './Autocomplete.js';

function makeKey(key: string, overrides: Partial<KeyEvent> = {}): KeyEvent {
    return {
        key,
        shift: false,
        ctrl: false,
        alt: false,
        raw: Buffer.alloc(0),
        stopPropagation: () => {},
        preventDefault: () => {},
        ...overrides,
    };
}

// ─────────────────────────────────────────────────────
// Existing baseline tests (preserved)
// ─────────────────────────────────────────────────────

describe('Autocomplete', () => {
    let screen: Screen;

    beforeEach(() => {
        screen = new Screen(40, 10);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes with default values', () => {
        const widget = new Autocomplete({}, { items: ['apple', 'banana', 'cherry'] });
        expect(widget.query).toBe('');
        expect(widget.items).toEqual(['apple', 'banana', 'cherry']);
    });

    it('typing characters appends to query and filters suggestions', () => {
        const onChange = vi.fn();
        const widget = new Autocomplete({}, {
            items: ['apple', 'banana', 'apricot'],
            onChange
        });

        widget.handleKey(makeKey('a'));
        expect(widget.query).toBe('a');
        expect(onChange).toHaveBeenCalledWith('a');

        widget.handleKey(makeKey('p'));
        expect(widget.query).toBe('ap');
        expect(onChange).toHaveBeenCalledWith('ap');
    });

    it('backspace removes last character and refilters suggestions', () => {
        const onChange = vi.fn();
        const widget = new Autocomplete({}, {
            items: ['apple', 'banana', 'apricot'],
            onChange
        });

        widget.query = 'app';
        widget.handleKey(makeKey('backspace'));

        expect(widget.query).toBe('ap');
        expect(onChange).toHaveBeenCalledWith('ap');
    });

    it('arrow keys and tab navigate suggestions list', () => {
        const widget = new Autocomplete({}, {
            items: ['apple', 'apricot', 'banana'],
        });
        widget.query = 'ap'; // matches 'apple', 'apricot'

        widget.handleKey(makeKey('down')); // highlights index 0 ('apple')
        
        // We can simulate rendering to verify list is open and rendered
        widget.isFocused = true;
        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);

        const lines = screen.back.map(row => row.map(c => c.char).join('').trim());
        expect(lines[1]).toContain('apple');
        expect(lines[2]).toContain('apricot');
    });

    it('enter selects highlighted suggestion', () => {
        const onSelect = vi.fn();
        const widget = new Autocomplete({}, {
            items: ['apple', 'apricot', 'banana'],
            onSelect
        });
        widget.query = 'ap';

        widget.handleKey(makeKey('down')); // Highlight 'apple'
        widget.handleKey(makeKey('down')); // Highlight 'apricot'
        widget.handleKey(makeKey('enter')); // Select 'apricot'

        expect(widget.query).toBe('apricot');
        expect(onSelect).toHaveBeenCalledWith('apricot');
    });

    it('escape closes suggestions dropdown', () => {
        const widget = new Autocomplete({}, {
            items: ['apple', 'apricot'],
        });
        widget.query = 'ap';
        widget.isFocused = true;

        widget.handleKey(makeKey('down')); // Opens and highlights first item
        widget.handleKey(makeKey('escape')); // Closes dropdown

        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);

        const lines = screen.back.map(row => row.map(c => c.char).join('').trim());
        expect(lines[1]).toBe(''); // suggestions dropdown is closed
    });

    it('uses custom filter function when provided', () => {
        // Custom filter matching elements containing the query substring anywhere
        const customFilter = (query: string, item: string) => item.includes(query);
        const widget = new Autocomplete({}, {
            items: ['apple', 'pineapple', 'banana'],
            filter: customFilter
        });

        widget.query = 'apple'; // Matches 'apple' and 'pineapple'
        widget.isFocused = true;
        widget.handleKey(makeKey('down')); // Opens dropdown
        
        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);

        const lines = screen.back.map(row => row.map(c => c.char).join('').trim());
        expect(lines[1]).toContain('apple');
        expect(lines[2]).toContain('pineapple');
    });

    it('respects caps.unicode for rendering pointer and selected indicator', () => {
        // Mock unicode support to true
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        
        const widget = new Autocomplete({}, {
            items: ['apple'],
            placeholder: 'Search...'
        });
        widget.query = 'ap';
        widget.isFocused = true;
        widget.handleKey(makeKey('down')); // Highlight first item

        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);

        let lines = screen.back.map(row => row.map(c => c.char).join('').trim());
        expect(lines[0]).toContain('➔ ap');
        expect(lines[1]).toContain('● apple');

        // Mock unicode support to false
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        screen = new Screen(40, 10);
        widget.render(screen);

        lines = screen.back.map(row => row.map(c => c.char).join('').trim());
        expect(lines[0]).toContain('> ap');
        expect(lines[1]).toContain('* apple');
    });

    it('renders placeholder when query is empty and not focused', () => {
        const widget = new Autocomplete({}, {
            items: ['apple'],
            placeholder: 'Type here...'
        });
        widget.isFocused = false;

        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);

        const lines = screen.back.map(row => row.map(c => c.char).join('').trim());
        expect(lines[0]).toContain('Type here...');
    });
});

// ─────────────────────────────────────────────────────
// 1. Multiple backspaces
// ─────────────────────────────────────────────────────

describe('Autocomplete — multiple backspaces', () => {
    it('updates query correctly after each deletion', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('a'));
        widget.handleKey(makeKey('b'));
        widget.handleKey(makeKey('c'));
        expect(widget.query).toBe('abc');

        widget.handleKey(makeKey('backspace'));
        expect(widget.query).toBe('ab');

        widget.handleKey(makeKey('backspace'));
        expect(widget.query).toBe('a');

        widget.handleKey(makeKey('backspace'));
        expect(widget.query).toBe('');
    });

    it('query becomes empty after deleting all typed characters', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('x'));
        widget.handleKey(makeKey('y'));
        widget.handleKey(makeKey('backspace'));
        widget.handleKey(makeKey('backspace'));

        expect(widget.query).toBe('');
    });

    it('does not throw during sequential backspaces emptying the query', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('a'));
        widget.handleKey(makeKey('b'));
        widget.handleKey(makeKey('c'));

        expect(() => {
            widget.handleKey(makeKey('backspace'));
            widget.handleKey(makeKey('backspace'));
            widget.handleKey(makeKey('backspace'));
        }).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────
// 2. Backspace beyond empty query
// ─────────────────────────────────────────────────────

describe('Autocomplete — backspace beyond empty query', () => {
    it('does not throw when backspace is pressed on an already-empty query', () => {
        const widget = new Autocomplete();

        expect(() => {
            widget.handleKey(makeKey('backspace'));
            widget.handleKey(makeKey('backspace'));
            widget.handleKey(makeKey('backspace'));
        }).not.toThrow();
    });

    it('query remains empty after repeated backspace on empty query', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('backspace'));
        widget.handleKey(makeKey('backspace'));
        widget.handleKey(makeKey('backspace'));

        expect(widget.query).toBe('');
    });
});

// ─────────────────────────────────────────────────────
// 3. Numeric characters
// ─────────────────────────────────────────────────────

describe('Autocomplete — numeric characters', () => {
    it('appends numeric characters in order', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('1'));
        widget.handleKey(makeKey('2'));
        widget.handleKey(makeKey('3'));

        expect(widget.query).toBe('123');
    });

    it('preserves order of numeric input', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('9'));
        widget.handleKey(makeKey('0'));
        widget.handleKey(makeKey('1'));

        expect(widget.query).toBe('901');
    });
});

// ─────────────────────────────────────────────────────
// 4. Special printable characters
// ─────────────────────────────────────────────────────

describe('Autocomplete — special printable characters', () => {
    it('appends punctuation and symbol characters in order', () => {
        const widget = new Autocomplete();
        const special = ['.', ',', '-', '_', '@', '#', '!', '?'];

        for (const ch of special) {
            widget.handleKey(makeKey(ch));
        }

        expect(widget.query).toBe(special.join(''));
    });

    it('each special character is individually appended', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('.'));
        expect(widget.query).toBe('.');

        widget.handleKey(makeKey('@'));
        expect(widget.query).toBe('.@');

        widget.handleKey(makeKey('!'));
        expect(widget.query).toBe('.@!');
    });
});

// ─────────────────────────────────────────────────────
// 5. Shifted / uppercase characters
// ─────────────────────────────────────────────────────

describe('Autocomplete — shifted characters', () => {
    it('stores uppercase characters as provided', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('A'));
        widget.handleKey(makeKey('B'));
        widget.handleKey(makeKey('C'));

        expect(widget.query).toBe('ABC');
    });

    it('preserves mixed casing of input', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('H'));
        widget.handleKey(makeKey('e'));
        widget.handleKey(makeKey('L'));
        widget.handleKey(makeKey('L'));
        widget.handleKey(makeKey('o'));

        expect(widget.query).toBe('HeLLo');
    });
});

// ─────────────────────────────────────────────────────
// 6. Non-character keys are ignored
// ─────────────────────────────────────────────────────

describe('Autocomplete — non-character keys are ignored', () => {
    const ignoredKeys = ['enter', 'escape', 'tab', 'up', 'down', 'left', 'right'];

    for (const key of ignoredKeys) {
        it(`"${key}" does not modify query and does not throw`, () => {
            const widget = new Autocomplete();

            expect(() => widget.handleKey(makeKey(key))).not.toThrow();
            expect(widget.query).toBe('');
        });
    }
});

// ─────────────────────────────────────────────────────
// 7. Ctrl and Alt combinations
// ─────────────────────────────────────────────────────

describe('Autocomplete — ctrl and alt combinations', () => {
    it('ctrl+a does not modify query', () => {
        const widget = new Autocomplete();
        widget.handleKey({ ...makeKey('a'), ctrl: true });
        expect(widget.query).toBe('');
    });

    it('ctrl+c does not modify query', () => {
        const widget = new Autocomplete();
        widget.handleKey({ ...makeKey('c'), ctrl: true });
        expect(widget.query).toBe('');
    });

    it('ctrl+v does not modify query', () => {
        const widget = new Autocomplete();
        widget.handleKey({ ...makeKey('v'), ctrl: true });
        expect(widget.query).toBe('');
    });

    it('alt+x does not modify query', () => {
        const widget = new Autocomplete();
        widget.handleKey({ ...makeKey('x'), alt: true });
        expect(widget.query).toBe('');
    });

    it('alt+enter does not modify query', () => {
        const widget = new Autocomplete();
        widget.handleKey({ ...makeKey('enter'), alt: true });
        expect(widget.query).toBe('');
    });
});

// ─────────────────────────────────────────────────────
// 8. Query preservation across ignored keys
// ─────────────────────────────────────────────────────

describe('Autocomplete — query preservation across ignored keys', () => {
    it('typing then pressing enter and escape leaves query intact', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('h'));
        widget.handleKey(makeKey('i'));
        widget.handleKey(makeKey('enter'));
        widget.handleKey(makeKey('escape'));

        expect(widget.query).toBe('hi');
    });

    it('ignored keys interspersed between typed chars do not corrupt query', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('a'));
        widget.handleKey(makeKey('up'));
        widget.handleKey(makeKey('b'));
        widget.handleKey(makeKey('down'));
        widget.handleKey(makeKey('c'));
        widget.handleKey(makeKey('tab'));

        expect(widget.query).toBe('abc');
    });
});

// ─────────────────────────────────────────────────────
// 9. Rendering displays query
// ─────────────────────────────────────────────────────

describe('Autocomplete — rendering displays query', () => {
    it('typed text appears in rendered output', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('h'));
        widget.handleKey(makeKey('i'));

        const screenInstance = new Screen(40, 5);
        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        widget.render(screenInstance);

        const row0 = screenInstance.back[0].map((c: { char: string }) => c.char).join('');
        expect(row0).toContain('h');
        expect(row0).toContain('i');
    });

    it('query content is visible on screen as a contiguous substring', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('f'));
        widget.handleKey(makeKey('o'));
        widget.handleKey(makeKey('o'));

        const screenInstance = new Screen(40, 5);
        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        widget.render(screenInstance);

        const row0 = screenInstance.back[0].map((c: { char: string }) => c.char).join('');
        expect(row0).toContain('foo');
    });
});

// ─────────────────────────────────────────────────────
// 10. Rendering with empty query
// ─────────────────────────────────────────────────────

describe('Autocomplete — rendering with empty query', () => {
    it('renders successfully without throwing on construction', () => {
        const widget = new Autocomplete();
        const screenInstance = new Screen(40, 5);

        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        expect(() => widget.render(screenInstance)).not.toThrow();
    });

    it('displays a pointer character when query is empty', () => {
        const widget = new Autocomplete();
        const screenInstance = new Screen(40, 5);

        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        widget.render(screenInstance);

        const row0 = screenInstance.back[0].map((c: { char: string }) => c.char).join('');
        // pointer is either '➔' (unicode) or '>' (ASCII)
        expect(row0).toMatch(/[➔>]/);
    });
});

// ─────────────────────────────────────────────────────
// 11. Unicode vs ASCII pointer rendering
// ─────────────────────────────────────────────────────

describe('Autocomplete — unicode and ASCII pointer rendering', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders the unicode pointer ➔ when caps.unicode is true', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const widget = new Autocomplete();
        const screenInstance = new Screen(40, 5);
        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        widget.render(screenInstance);

        const row0 = screenInstance.back[0].map((c: { char: string }) => c.char).join('');
        expect(row0).toContain('➔');
    });

    it('renders the ASCII pointer > when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const widget = new Autocomplete();
        const screenInstance = new Screen(40, 5);
        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        widget.render(screenInstance);

        const row0 = screenInstance.back[0].map((c: { char: string }) => c.char).join('');
        expect(row0).toContain('>');
        expect(row0).not.toContain('➔');
    });
});

// ─────────────────────────────────────────────────────
// 12. Long query rendering
// ─────────────────────────────────────────────────────

describe('Autocomplete — long query rendering', () => {
    it('does not throw when query length exceeds widget width', () => {
        const widget = new Autocomplete();

        // Type 26 chars into a 20-column widget
        for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
            widget.handleKey(makeKey(ch));
        }

        const screen = new Screen(20, 5);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        expect(() => widget.render(screen)).not.toThrow();
    });

    it('rendered row count matches screen height for a long query', () => {
        const widget = new Autocomplete();

        for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
            widget.handleKey(makeKey(ch));
        }

        const screen = new Screen(20, 5);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        widget.render(screen);

        // Screen dimensions must remain stable
        expect(screen.back.length).toBe(5);
        expect(screen.back[0].length).toBe(20);
    });
});

// ─────────────────────────────────────────────────────
// 13. Query getter consistency
// ─────────────────────────────────────────────────────

describe('Autocomplete — query getter consistency', () => {
    it('query getter reflects state after each typed character', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('a'));
        expect(widget.query).toBe('a');

        widget.handleKey(makeKey('b'));
        expect(widget.query).toBe('ab');

        widget.handleKey(makeKey('c'));
        expect(widget.query).toBe('abc');
    });

    it('query getter reflects state after each backspace', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('x'));
        widget.handleKey(makeKey('y'));
        widget.handleKey(makeKey('z'));
        expect(widget.query).toBe('xyz');

        widget.handleKey(makeKey('backspace'));
        expect(widget.query).toBe('xy');

        widget.handleKey(makeKey('backspace'));
        expect(widget.query).toBe('x');
    });

    it('query getter is unchanged by ignored keys', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('h'));
        widget.handleKey(makeKey('i'));

        const queryBefore = widget.query;

        widget.handleKey(makeKey('enter'));
        widget.handleKey(makeKey('escape'));
        widget.handleKey(makeKey('tab'));
        widget.handleKey({ ...makeKey('c'), ctrl: true });

        expect(widget.query).toBe(queryBefore);
        expect(widget.query).toBe('hi');
    });
});
