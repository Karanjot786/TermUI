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

    it('intercepts stdout when active', () => {
        hook.start();
        process.stdout.write('test log 1\n');
        process.stdout.write('test log 2\n');
        
        expect(hook.flush()).toBe('test log 1\ntest log 2\n');
        expect(hook.flush()).toBe(''); // Buffer should be empty after flush
    });

    it('restores original stdout on stop', () => {
        const originalWrite = process.stdout.write;
        hook.start();
        expect(process.stdout.write).not.toBe(originalWrite);
        
        hook.stop();
        expect(process.stdout.write).toBe(originalWrite);
    });

    it('writeRaw bypasses the buffer', () => {
        hook.start();
        hook.writeRaw('direct write bypass');
        
        // The buffer shouldn't capture writeRaw output
        expect(hook.flush()).toBe(''); 
    });
});