import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RenderHook } from './render-hook.js';

describe('RenderHook', () => {
    let hook: RenderHook;

    beforeEach(() => {
        hook = new RenderHook();
    });

    afterEach(() => {
        // Guarantee restoration even if a test fails
        hook.stop();
    });

    it('intercepts console.log when active', () => {
        hook.start();
        console.log('test log 1');
        console.log('test log 2');

        expect(hook.flush()).toBe('test log 1\ntest log 2\n');
        expect(hook.flush()).toBe(''); // Buffer should be empty after flush
    });

    it('restores original console.log on stop', () => {
        const originalLog = console.log;
        hook.start();
        expect(console.log).not.toBe(originalLog);

        hook.stop();
        expect(console.log).toBe(originalLog);
    });

    it('intercepts console.warn and console.error', () => {
        const originalWarn = console.warn;
        const originalError = console.error;
        hook.start();
        expect(console.warn).not.toBe(originalWarn);
        expect(console.error).not.toBe(originalError);
        hook.stop();
        expect(console.warn).toBe(originalWarn);
        expect(console.error).toBe(originalError);
    });

    it('writeRaw bypasses the buffer', () => {
        hook.start();
        hook.writeRaw('direct write bypass');

        // The buffer shouldn't capture writeRaw output
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
});