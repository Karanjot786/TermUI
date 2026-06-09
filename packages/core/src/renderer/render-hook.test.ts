import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RenderHook } from './render-hook.js';

describe('RenderHook', () => {
    let hook: RenderHook;

    beforeEach(() => {
        hook = new RenderHook();
    });

    afterEach(() => {
        // Guarantee restoration even if a test fails
        RenderHook.globalRestore();
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

    describe('multi-instance', () => {
        let hookA: RenderHook;
        let hookB: RenderHook;

        beforeEach(() => {
            hookA = new RenderHook();
            hookB = new RenderHook();
        });

        it('two instances: A start, B start, A stop, B stop — restores original write', () => {
            const originalWrite = process.stdout.write;

            hookA.start();
            process.stdout.write('msgA');
            expect(hookA.flush()).toBe('msgA');

            hookB.start();
            process.stdout.write('msgB');
            expect(hookB.flush()).toBe('msgB');

            // stop A — stdout should still be patched because B is active
            hookA.stop();
            expect(process.stdout.write).not.toBe(originalWrite);

            // stop B — now restore
            hookB.stop();
            expect(process.stdout.write).toBe(originalWrite);
        });

        it('each instance buffers independently', () => {
            hookA.start();
            hookB.start();

            process.stdout.write('fromA');
            process.stdout.write('fromB');

            expect(hookA.flush()).toBe('fromAfromB');
            expect(hookB.flush()).toBe('fromAfromB');

            process.stdout.write('afterFlush');
            expect(hookA.flush()).toBe('afterFlush');
            expect(hookB.flush()).toBe('afterFlush');
        });
    });

    describe('suspend/resume', () => {
        let hook: RenderHook;

        beforeEach(() => {
            hook = new RenderHook();
        });

        it('suspendAll bypasses buffering', () => {
            const originalWrite = process.stdout.write;
            hook.start();
            expect(process.stdout.write).not.toBe(originalWrite);

            RenderHook.suspendAll();
            process.stdout.write('bypass');
            expect(hook.flush()).toBe('');
        });

        it('resumeAll restores buffering after suspend', () => {
            hook.start();
            RenderHook.suspendAll();
            process.stdout.write('during suspend');
            expect(hook.flush()).toBe('');

            RenderHook.resumeAll();
            process.stdout.write('after resume');
            expect(hook.flush()).toBe('after resume');
        });

        it('suspendAll/resumeAll in try/finally restores even when write throws', () => {
            hook.start();

            expect(() => {
                RenderHook.suspendAll();
                try {
                    const fn: any = () => { throw new Error('write error'); };
                    fn();
                } finally {
                    RenderHook.resumeAll();
                }
            }).toThrow('write error');

            // After the throw, resumeAll should have run
            process.stdout.write('after throw');
            expect(hook.flush()).toBe('after throw');
        });
    });
});