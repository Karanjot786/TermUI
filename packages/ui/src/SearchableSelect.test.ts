import { describe, it, expect } from 'vitest';
import { SearchableSelect } from './SearchableSelect.js';
import { type KeyEvent } from '@termuijs/core';

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

describe('SearchableSelect', () => {
    it('backspace removes last character from searchQuery', () => {
        const widget = new SearchableSelect();

        widget.handleKey(makeKey('a'));
        widget.handleKey(makeKey('b'));
        widget.handleKey(makeKey('backspace'));

        expect(widget.searchQuery).toBe('a');
    });

    it('typing characters appends to searchQuery', () => {
        const widget = new SearchableSelect();

        widget.handleKey(makeKey('h'));
        widget.handleKey(makeKey('i'));

        expect(widget.searchQuery).toBe('hi');
    });

    it('down arrow does not throw and selectedOption is defined', () => {
        const widget = new SearchableSelect();

        widget.handleKey(makeKey('down'));

        expect(widget.selectedOption).toBeDefined();
    });

    it('up arrow does not throw', () => {
        const widget = new SearchableSelect();

        expect(() => widget.handleKey(makeKey('up'))).not.toThrow();
    });

    it('enter does not throw', () => {
        const widget = new SearchableSelect();

        expect(() => widget.handleKey(makeKey('enter'))).not.toThrow();
    });
});
