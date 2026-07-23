// ─────────────────────────────────────────────────────
// Tests — Context API (createContext / useContext)
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createContext, useContext, useContextSelector } from './context.js';
import {
    createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender,
    type Fiber,
} from './hooks.js';

describe('createContext', () => {
    it('creates a context with default value', () => {
        const ctx = createContext('hello');
        expect(ctx.defaultValue).toBe('hello');
        expect(typeof ctx._id).toBe('symbol');
        expect(typeof ctx.Provider).toBe('function');
    });

    it('context is frozen (immutable)', () => {
        const ctx = createContext(42);
        expect(Object.isFrozen(ctx)).toBe(true);
    });
});

describe('useContext', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        setRequestRender(null);
        clearCurrentFiber();
    });

    it('returns default value when no provider exists', () => {
        const ctx = createContext('default');
        expect(useContext(ctx)).toBe('default');
    });

    it('returns provided value from current fiber', () => {
        const ctx = createContext('default');
        fiber.contextValues.set(ctx._id, 'provided');
        expect(useContext(ctx)).toBe('provided');
    });

    it('walks up fiber tree to find provider', () => {
        const ctx = createContext('default');

        // Create a parent → child hierarchy
        const parentFiber = createFiber();
        parentFiber.contextValues.set(ctx._id, 'from-parent');

        const childFiber = createFiber(parentFiber);
        setCurrentFiber(childFiber);

        expect(useContext(ctx)).toBe('from-parent');
    });

    it('nearest provider wins over distant ancestor', () => {
        const ctx = createContext('default');

        const grandparent = createFiber();
        grandparent.contextValues.set(ctx._id, 'grandparent-value');

        const parent = createFiber(grandparent);
        parent.contextValues.set(ctx._id, 'parent-value');

        const child = createFiber(parent);
        setCurrentFiber(child);

        expect(useContext(ctx)).toBe('parent-value');
    });

    it('different contexts are independent', () => {
        const ctx1 = createContext('default-1');
        const ctx2 = createContext('default-2');

        fiber.contextValues.set(ctx1._id, 'value-1');

        expect(useContext(ctx1)).toBe('value-1');
        expect(useContext(ctx2)).toBe('default-2');
    });

    it('supports object values', () => {
        const theme = { bg: 'black', fg: 'white', accent: 'cyan' };
        const ctx = createContext(theme);

        const customTheme = { bg: 'navy', fg: 'silver', accent: 'gold' };
        fiber.contextValues.set(ctx._id, customTheme);

        expect(useContext(ctx)).toBe(customTheme);
        expect(useContext(ctx).accent).toBe('gold');
    });

    it('Provider component sets value on fiber', () => {
        const ctx = createContext('default');

        // Simulate what the Provider does when rendered
        setCurrentFiber(fiber);
        ctx.Provider({ value: 'custom', children: undefined as any });

        expect(fiber.contextValues.get(ctx._id)).toBe('custom');
    });

    it('useContextSelector returns a selected value', () => {
        const ctx = createContext({ count: 0, label: 'idle' });
        fiber.contextValues.set(ctx._id, { count: 2, label: 'ready' });

        expect(useContextSelector(ctx, value => value.label)).toBe('ready');
    });

    it('selector subscriptions skip updates when the selected value is unchanged', async () => {
        const ctx = createContext({ count: 0, label: 'idle' });
        const provider = createFiber();
        const consumer = createFiber(provider);
        const render = vi.fn();
        setRequestRender(render);

        setCurrentFiber(provider);
        ctx.Provider({ value: { count: 0, label: 'idle' }, children: undefined as any });

        setCurrentFiber(consumer);
        expect(useContextSelector(ctx, value => value.count)).toBe(0);

        setCurrentFiber(provider);
        ctx.Provider({ value: { count: 0, label: 'busy' }, children: undefined as any });
        await Promise.resolve();

        expect(render).not.toHaveBeenCalled();

        ctx.Provider({ value: { count: 1, label: 'busy' }, children: undefined as any });
        await Promise.resolve();

        expect(render).toHaveBeenCalledOnce();
    });

    it('reuses selector subscriptions for the same fiber across renders', () => {
        const ctx = createContext({ count: 0 });
        const provider = createFiber();
        const consumer = createFiber(provider);

        setCurrentFiber(provider);
        ctx.Provider({ value: { count: 0 }, children: undefined as any });

        setCurrentFiber(consumer);
        expect(useContextSelector(ctx, value => value.count)).toBe(0);
        expect(useContextSelector(ctx, value => value.count)).toBe(0);

        expect(provider.contextSubscribers?.get(ctx._id)?.size).toBe(1);
    });
});

// Need afterEach import
import { afterEach } from 'vitest';
