// ─────────────────────────────────────────────────────
// Tests — memo() and shallowEqual
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { memo, shallowEqual } from './memo.js';
import type { VNode } from './vnode.js';

describe('shallowEqual', () => {
    it('returns true for identical objects', () => {
        const obj = { a: 1, b: 'hello' };
        expect(shallowEqual(obj, obj)).toBe(true);
    });

    it('returns true for equal objects', () => {
        expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it('returns false for different values', () => {
        expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('returns false for different keys', () => {
        expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    it('returns false for different key count', () => {
        expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('does not deep-compare objects', () => {
        const inner = { x: 1 };
        expect(shallowEqual({ a: inner }, { a: inner })).toBe(true);
        expect(shallowEqual({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false);
    });

    it('uses Object.is for NaN', () => {
        expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
    });
});

describe('memo', () => {
    it('calls the component on first render', () => {
        const component = vi.fn((props: { label: string }) => `text:${props.label}` as unknown as VNode);
        const Memoized = memo(component);

        Memoized({ label: 'hello' });
        expect(component).toHaveBeenCalledOnce();
    });

    it('skips re-render when props are equal', () => {
        const component = vi.fn((props: { label: string }) => `text:${props.label}` as unknown as VNode);
        const Memoized = memo(component);

        const result1 = Memoized({ label: 'hello' });
        const result2 = Memoized({ label: 'hello' });

        expect(component).toHaveBeenCalledOnce();
        expect(result1).toBe(result2);
    });

    it('re-renders when props change', () => {
        const component = vi.fn((props: { label: string }) => `text:${props.label}` as unknown as VNode);
        const Memoized = memo(component);

        Memoized({ label: 'hello' });
        Memoized({ label: 'world' });

        expect(component).toHaveBeenCalledTimes(2);
    });

    it('supports custom comparison function', () => {
        const component = vi.fn((props: { id: number; label: string }) => `text:${props.label}` as unknown as VNode);
        const Memoized = memo(component, (prev, next) => prev.id === next.id);

        Memoized({ id: 1, label: 'hello' });
        Memoized({ id: 1, label: 'changed' }); // same id, different label

        expect(component).toHaveBeenCalledOnce(); // skipped because id is same
    });

    it('has displayName', () => {
        function MyComponent() { return null as any; }
        const Memoized = memo(MyComponent);
        expect((Memoized as any).displayName).toBe('memo(MyComponent)');
    });

    it('has _isMemo flag', () => {
        const Memoized = memo(() => null as any);
        expect((Memoized as any)._isMemo).toBe(true);
    });
});
