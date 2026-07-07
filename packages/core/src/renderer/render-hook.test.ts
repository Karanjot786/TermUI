import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RenderHook } from './render-hook.js';

describe('RenderHook', () => {
    let hook: RenderHook;

    beforeEach(() => {
        hook = new RenderHook();
    });

    afterEach(() => {
        hook.stop();
    });

    it('intercepts console.log when active', () => {
        hook.start();
        console.log('test log 1');
        console.log('test log 2');

        expect(hook.flush()).toBe('test log 1\ntest log 2\n');
        expect(hook.flush()).toBe('');
    });

    it('restores original console.log on stop', () => {
        const originalLog = console.log;
        hook.start();
        expect(console.log).not.toBe(originalLog);

        hook.stop();
        expect(console.log).toBe(originalLog);
    });

    it('intercepts console.warn, console.error, and other methods when active', () => {
        const methods = ['warn', 'error', 'debug', 'trace', 'info'] as const;
        const originals = methods.map(m => (console as any)[m]);
        hook.start();
        for (const m of methods) {
            expect((console as any)[m]).not.toBe(originals[methods.indexOf(m)]);
        }
        hook.stop();
        for (const m of methods) {
            expect((console as any)[m]).toBe(originals[methods.indexOf(m)]);
        }
    });

    it('writeRaw bypasses the buffer', () => {
        hook.start();
        hook.writeRaw('direct write bypass');

        expect(hook.flush()).toBe('');
    });

    it('multiple console.log calls are buffered and flushed', () => {
        hook.start();
        console.log('first');
        console.log('second');
        console.log('third');

        expect(hook.flush()).toBe('first\nsecond\nthird\n');
    });

    it('flush empties the buffer', () => {
        hook.start();
        console.log('hello');
        hook.flush();
        expect(hook.flush()).toBe('');
    });

    it('isActive returns correct state', () => {
        expect(hook.isActive).toBe(false);
        hook.start();
        expect(hook.isActive).toBe(true);
        hook.stop();
        expect(hook.isActive).toBe(false);
    });

    it('multiple arguments are joined with space', () => {
        hook.start();
        console.log('a', 'b', 'c');
        expect(hook.flush()).toBe('a b c\n');
    });

    it('calls through to the original console.log so output remains visible', () => {
        const spy = vi.spyOn(console, 'log');
        hook.start();
        console.log('visible output');
        expect(hook.flush()).toBe('visible output\n');
        expect(spy).toHaveBeenCalledWith('visible output');
        spy.mockRestore();
    });
});