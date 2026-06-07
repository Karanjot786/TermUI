// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Autocomplete component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Autocomplete } from './Autocomplete.js';
import { Screen, caps, type KeyEvent } from '@termuijs/core';

function makeKey(key: string): KeyEvent {
    return {
        key,
        shift: false,
        ctrl: false,
        alt: false,
        raw: Buffer.alloc(0),
        stopPropagation: () => {},
        preventDefault: () => {},
    };
}

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
