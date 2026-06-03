import { describe, it, expect } from 'vitest';
import { Autocomplete } from './Autocomplete.js';
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

describe('Autocomplete', () => {
    it('typing characters appends to query', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('h'));
        widget.handleKey(makeKey('i'));

        expect(widget.query).toBe('hi');
    });

    it('backspace removes last character from query', () => {
        const widget = new Autocomplete();

        widget.handleKey(makeKey('a'));
        widget.handleKey(makeKey('b'));
        widget.handleKey(makeKey('backspace'));

        expect(widget.query).toBe('a');
    });

    it('ctrl+key does not append to query', () => {
        const widget = new Autocomplete();

        widget.handleKey({ ...makeKey('c'), ctrl: true });

        expect(widget.query).toBe('');
    });

    it('alt+key does not append to query', () => {
        const widget = new Autocomplete();

        widget.handleKey({ ...makeKey('x'), alt: true });

        expect(widget.query).toBe('');
    });

    it('backspace on empty query does not throw', () => {
        const widget = new Autocomplete();

        expect(() => widget.handleKey(makeKey('backspace'))).not.toThrow();
        expect(widget.query).toBe('');
    });
});
