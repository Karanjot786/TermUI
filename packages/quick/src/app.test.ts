import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@termuijs/core';
import { List, TextInput } from '@termuijs/widgets';
import { app, input, list } from './index.js';

describe('quick – focus traversal', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('focuses the first focusable widget in tree order', async () => {
        const builder = app('Focus Order');
        builder.rows(
            input('First'),
            list(['one']),
            input('Second'),
        );

        const root = (builder as any)._buildRoot();

        vi.spyOn(App.prototype, 'mount').mockResolvedValue(0);

        await (builder as any)._runWithRoot(root);
        const appInstance = (builder as any)._app;

        const focusables: Array<TextInput | List> = [];
        const collect = (widget: any) => {
            if (widget instanceof TextInput || widget instanceof List) {
                focusables.push(widget);
            }
            for (const child of widget.children) {
                collect(child);
            }
        };
        collect(root);

        expect(focusables.length).toBe(3);
        expect(focusables[0]).toBeInstanceOf(TextInput);
        expect(focusables[0].isFocused).toBe(true);
        expect(focusables[1]).toBeInstanceOf(List);
        expect(focusables[1].isFocused).toBe(false);
        expect(focusables[2]).toBeInstanceOf(TextInput);
        expect(focusables[2].isFocused).toBe(false);

        appInstance.focus.focusNext();
        expect(focusables[0].isFocused).toBe(false);
        expect(focusables[1].isFocused).toBe(true);

        appInstance.focus.focusNext();
        expect(focusables[1].isFocused).toBe(false);
        expect(focusables[2].isFocused).toBe(true);

        appInstance.focus.focusPrev();
        expect(focusables[1].isFocused).toBe(true);
        expect(focusables[2].isFocused).toBe(false);
    });
});
