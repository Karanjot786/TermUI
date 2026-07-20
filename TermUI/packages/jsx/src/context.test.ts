// ─────────────────────────────────────────────────────
// Tests — Context API (createContext / useContext)
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { createContext, useContext } from './context.js';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
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
});

// Need afterEach import
import { afterEach } from 'vitest';
