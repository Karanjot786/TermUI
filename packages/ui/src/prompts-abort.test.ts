import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prompt, select, textInput, numberInput, form } from './prompts.js';
import { TermUIAbortError } from '@termuijs/core';

describe('AbortSignal prompt integration', () => {
    let originalIsTTY: any /* descriptor type */;
    let originalSetRawMode: any /* descriptor type */;
    let setRawModeSpy: any /* spy function */;

    beforeEach(() => {
        originalIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
        originalSetRawMode = Object.getOwnPropertyDescriptor(process.stdin, 'setRawMode');

        Object.defineProperty(process.stdin, 'isTTY', {
            configurable: true,
            get: () => true,
        });

        setRawModeSpy = vi.fn();
        Object.defineProperty(process.stdin, 'setRawMode', {
            configurable: true,
            value: setRawModeSpy,
        });

        // Mock write to avoid writing TUI escape sequences to test output
        vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (originalIsTTY) {
            Object.defineProperty(process.stdin, 'isTTY', originalIsTTY);
        } else {
            delete (process.stdin as any).isTTY;
        }
        if (originalSetRawMode) {
            Object.defineProperty(process.stdin, 'setRawMode', originalSetRawMode);
        } else {
            delete (process.stdin as any).setRawMode;
        }
    });

    it('rejects select prompt with TermUIAbortError on signal abort', async () => {
        const controller = new AbortController();
        const sel = select({
            options: ['a', 'b', 'c'],
            signal: controller.signal,
        });

        const promise = prompt(sel);

        // Abort the controller
        controller.abort();

        await expect(promise).rejects.toThrow(TermUIAbortError);
        // Verify raw mode was cleaned up (called with false)
        expect(setRawModeSpy).toHaveBeenCalledWith(false);
    });

    it('rejects textInput prompt with TermUIAbortError on signal abort', async () => {
        const controller = new AbortController();
        const input = textInput({
            signal: controller.signal,
        });

        const promise = prompt(input);
        controller.abort();

        await expect(promise).rejects.toThrow(TermUIAbortError);
        expect(setRawModeSpy).toHaveBeenCalledWith(false);
    });

    it('rejects numberInput prompt with TermUIAbortError on signal abort', async () => {
        const controller = new AbortController();
        const input = numberInput({
            signal: controller.signal,
        });

        const promise = prompt(input);
        controller.abort();

        await expect(promise).rejects.toThrow(TermUIAbortError);
        expect(setRawModeSpy).toHaveBeenCalledWith(false);
    });

    it('rejects form prompt with TermUIAbortError on signal abort', async () => {
        const controller = new AbortController();
        const f = form(
            [
                { name: 'name', label: 'Name', type: 'text' },
            ],
            {
                signal: controller.signal,
            }
        );

        const promise = prompt(f);
        controller.abort();

        await expect(promise).rejects.toThrow(TermUIAbortError);
        expect(setRawModeSpy).toHaveBeenCalledWith(false);
    });

    it('rejects immediately if signal is already aborted', async () => {
        const controller = new AbortController();
        controller.abort();

        const sel = select({
            options: ['a', 'b', 'c'],
            signal: controller.signal,
        });

        await expect(prompt(sel)).rejects.toThrow(TermUIAbortError);
    });

    it('resolves select prompt successfully without aborting', async () => {
        const sel = select({
            options: ['a', 'b', 'c'],
        });
        const promise = prompt(sel);
        
        sel.selectNext();
        sel.confirm();
        
        await expect(promise).resolves.toBe('b');
        expect(setRawModeSpy).toHaveBeenCalledWith(false);
    });

    it('resolves textInput prompt successfully without aborting', async () => {
        const input = textInput();
        const promise = prompt(input);
        
        input.value = 'hello world';
        input.submit();
        
        await expect(promise).resolves.toBe('hello world');
        expect(setRawModeSpy).toHaveBeenCalledWith(false);
    });

    it('resolves numberInput prompt successfully without aborting', async () => {
        const input = numberInput();
        const promise = prompt(input);
        
        input.rawValue = '42';
        input.submit();
        
        await expect(promise).resolves.toBe(42);
        expect(setRawModeSpy).toHaveBeenCalledWith(false);
    });

    it('resolves form prompt successfully without aborting', async () => {
        const f = form([
            { name: 'name', label: 'Name', type: 'text' },
        ]);
        const promise = prompt(f);
        
        f.insertChar('A');
        f.insertChar('l');
        f.insertChar('i');
        f.insertChar('c');
        f.insertChar('e');
        await f.submit();
        
        await expect(promise).resolves.toEqual({ name: 'Alice' });
        expect(setRawModeSpy).toHaveBeenCalledWith(false);
    });
});
