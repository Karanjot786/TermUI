import { describe, expect, it, vi } from 'vitest';
import { Box } from '@termuijs/widgets';
import { type KeyEvent } from '@termuijs/core';
import { ConfirmDialog } from './ConfirmDialog.js';
import { Form } from './Form.js';
import { PasswordInput } from './PasswordInput.js';
import { Wizard } from './Wizard.js';

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

describe('UI key handlers after remount', () => {
    it('restores ConfirmDialog key handling', () => {
        const onCancel = vi.fn();
        const dialog = new ConfirmDialog({ message: 'Continue?', onCancel });
        remount(dialog);
        dialog.show();

        dialog.events.emit('key', key('escape'));

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('restores Form key handling', () => {
        const form = new Form([{ name: 'name', label: 'Name', type: 'text' }]);
        remount(form);

        form.events.emit('key', key('a'));

        expect(form.values).toEqual({ name: 'a' });
    });

    it('restores PasswordInput key handling', () => {
        const input = new PasswordInput();
        remount(input);

        input.events.emit('key', key('a'));

        expect(input.value).toBe('a');
    });

    it('restores Wizard key handling', () => {
        const wizard = new Wizard([
            { title: 'One', render: () => new Box() },
            { title: 'Two', render: () => new Box() },
        ]);
        remount(wizard);

        wizard.events.emit('key', key('right'));

        expect(wizard.currentStepIndex).toBe(1);
    });
});
