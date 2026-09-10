import { describe, expect, it } from 'vitest';
import { type KeyEvent } from '@termuijs/core';
import { List } from './input/List.js';
import { TextInput } from './input/TextInput.js';
import { Table } from './data/Table.js';
import { Accordion } from './display/Accordion.js';
import { SplitPane } from './layout/SplitPane.js';
import { ThinkingBlock } from './display/ThinkingBlock.js';
import { Box } from './display/Box.js';

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

    it('restores Accordion key handling', () => {
        const accordion = new Accordion([
            { title: 'One', content: 'content1' },
            { title: 'Two', content: 'content2' },
        ], {}, { openIndex: 0 });
        remount(accordion);

        accordion.events.emit('key', key('down'));

        expect(accordion.getFocusedIndex()).toBe(1);
    });

    it('restores SplitPane key handling', () => {
        const left = new Box();
        const right = new Box();
        const pane = new SplitPane(left, right, { width: 40, height: 10 }, { ratio: 0.5 });
        pane.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        remount(pane);

        pane.events.emit('key', { ...key('right'), shift: true });

        expect(pane.getRatio()).toBeGreaterThan(0.5);
    });

    it('restores ThinkingBlock key handling', () => {
        const block = new ThinkingBlock({ thinking: 'Test' });
        remount(block);

        block.events.emit('key', key('enter'));

        expect((block as any)._expanded).toBe(true);
    });
});
