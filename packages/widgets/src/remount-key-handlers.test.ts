import { describe, expect, it } from 'vitest';
import { type KeyEvent } from '@termuijs/core';
import { List } from './input/List.js';
import { TextInput } from './input/TextInput.js';
import { Table } from './data/Table.js';

function key(keyName: string): KeyEvent {
    return {
        key: keyName,
        shift: false,
        ctrl: false,
        alt: false,
        raw: Buffer.alloc(0),
        stopPropagation() {},
        preventDefault() {},
    };
}

function remount(widget: { mount(): void; unmount(): void }): void {
    widget.mount();
    widget.unmount();
    widget.mount();
}

describe('widget key handlers after remount', () => {
    it('restores List key handling', () => {
        const list = new List([
            { label: 'One', value: 'one' },
            { label: 'Two', value: 'two' },
        ]);
        remount(list);

        list.events.emit('key', key('down'));

        expect(list.selectedIndex).toBe(1);
    });

    it('restores TextInput key handling', () => {
        const input = new TextInput();
        remount(input);

        input.events.emit('key', key('a'));

        expect(input.value).toBe('a');
    });

    it('restores Table key handling', () => {
        const table = new Table(
            [{ header: 'Name', key: 'name' }],
            [{ name: 'One' }, { name: 'Two' }],
        );
        remount(table);

        table.events.emit('key', key('down'));

        expect(table.selectedRow).toBe(1);
    });
});
