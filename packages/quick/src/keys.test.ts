import { describe, it, expect, vi } from 'vitest';
import { app } from './index.js';
import { App } from '@termuijs/core';

// Helper to run builder without mounting terminal
async function runBuilder(builder: any) {
    const root = builder._buildRoot();
    vi.spyOn(App.prototype, 'mount').mockResolvedValue(0);
    await (builder as any)._runWithRoot(root);
    const appInstance = (builder as any)._app;
    return { builder, root, appInstance };
}

describe('quick – modifier-aware key bindings', () => {
    afterEach(() => vi.restoreAllMocks());

    it('simple binding q -> quit still works', async () => {
        const builder = app('keys');
        builder.keys({ q: 'quit' });
        const { appInstance } = await runBuilder(builder);
        const exitSpy = vi.spyOn(appInstance, 'exit');

        appInstance.events.emit('key', { key: 'q', raw: Buffer.alloc(0), ctrl: false, alt: false, shift: false });
        expect(exitSpy).toHaveBeenCalled();
    });

    it('ctrl+q binding triggers quit', async () => {
        const builder = app('keys');
        builder.keys({ 'ctrl+q': 'quit' });
        const { appInstance } = await runBuilder(builder);
        const exitSpy = vi.spyOn(appInstance, 'exit');

        appInstance.events.emit('key', { key: 'q', raw: Buffer.alloc(0), ctrl: true, alt: false, shift: false });
        expect(exitSpy).toHaveBeenCalled();
    });

    it('alt+x binding calls function', async () => {
        const fn = vi.fn();
        const builder = app('keys');
        builder.keys({ 'alt+x': fn });
        const { appInstance } = await runBuilder(builder);

        appInstance.events.emit('key', { key: 'x', raw: Buffer.alloc(0), ctrl: false, alt: true, shift: false });
        expect(fn).toHaveBeenCalled();
    });

    it('ctrl+shift+p calls function', async () => {
        const fn = vi.fn();
        const builder = app('keys');
        builder.keys({ 'ctrl+shift+p': fn });
        const { appInstance } = await runBuilder(builder);

        appInstance.events.emit('key', { key: 'p', raw: Buffer.alloc(0), ctrl: true, alt: false, shift: true });
        expect(fn).toHaveBeenCalled();
    });

    it('fallback coexistence: q and ctrl+q differ', async () => {
        const fn1 = vi.fn();
        const fn2 = vi.fn();
        const builder = app('keys');
        builder.keys({ q: fn1, 'ctrl+q': fn2 });
        const { appInstance } = await runBuilder(builder);

        appInstance.events.emit('key', { key: 'q', raw: Buffer.alloc(0), ctrl: false, alt: false, shift: false });
        expect(fn1).toHaveBeenCalled();

        appInstance.events.emit('key', { key: 'q', raw: Buffer.alloc(0), ctrl: true, alt: false, shift: false });
        expect(fn2).toHaveBeenCalled();
    });
});
