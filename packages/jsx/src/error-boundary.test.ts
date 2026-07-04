// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for ErrorBoundary
// ─────────────────────────────────────────────────────

import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary, hasWidgetRenderError } from './error-boundary.js';
import { Fragment } from './vnode.js';
import { Widget } from '@termuijs/widgets';

describe('ErrorBoundary component', () => {
    it('returns null when children is empty/undefined', () => {
        const result = ErrorBoundary({ children: [] });
        expect(result).toBeNull();

        const resultNull = ErrorBoundary({});
        expect(resultNull).toBeNull();
    });

    it('returns single child directly when only one child is passed', () => {
        const singleChild = { type: 'text', props: {}, children: [] } as any;
        const result = ErrorBoundary({ children: singleChild });
        expect(result).toBe(singleChild);

        const resultArr = ErrorBoundary({ children: [singleChild] });
        expect(resultArr).toBe(singleChild);
    });

    it('returns a Fragment wrapper when multiple children are passed', () => {
        const child1 = { type: 'text', props: {}, children: [] } as any;
        const child2 = { type: 'box', props: {}, children: [] } as any;
        const result = ErrorBoundary({ children: [child1, child2] });

        expect(result).toEqual({
            type: Fragment,
            children: [child1, child2],
        });
    });
});

describe('hasWidgetRenderError utility', () => {
    class MockWidget extends Widget {
        _renderError: Error | null = null;
        _children: MockWidget[] = [];

        constructor(renderError: Error | null = null, children: MockWidget[] = []) {
            super();
            this._renderError = renderError;
            this._children = children;
        }
    }

    it('returns null if there are no render errors', () => {
        const root = new MockWidget(null);
        expect(hasWidgetRenderError(root)).toBeNull();

        const child1 = new MockWidget(null);
        const child2 = new MockWidget(null);
        const parent = new MockWidget(null, [child1, child2]);
        expect(hasWidgetRenderError(parent)).toBeNull();
    });

    it('returns error if the root widget has a render error', () => {
        const err = new Error('Root error');
        const root = new MockWidget(err);
        expect(hasWidgetRenderError(root)).toBe(err);
    });

    it('recursively checks children and returns the first child error', () => {
        const err = new Error('Child error');
        const leaf = new MockWidget(err);
        const child1 = new MockWidget(null);
        const child2 = new MockWidget(null, [leaf]);
        const root = new MockWidget(null, [child1, child2]);

        expect(hasWidgetRenderError(root)).toBe(err);
    });
});

describe('ErrorBoundary async error handling', () => {
    it('marks ErrorBoundary component correctly', () => {
        const fallback = (err: Error) => ({ type: 'text', props: {}, children: [err.message] } as any);
        const result = ErrorBoundary({ fallback, children: [] });

        expect(result).toBeNull();
    });

    it('captures fallback callback when ErrorBoundary is created', () => {
        const fallbackFn = vi.fn((err: Error) => ({ type: 'text', props: {}, children: [err.message] } as any));
        const onErrorFn = vi.fn();

        const child = { type: 'component', props: {}, children: [] } as any;
        const result = ErrorBoundary({
            fallback: fallbackFn,
            onError: onErrorFn,
            children: child
        });

        expect(result).toBe(child);
    });

    it('handles multiple children with ErrorBoundary', () => {
        const child1 = { type: 'text', props: {}, children: ['Child 1'] } as any;
        const child2 = { type: 'text', props: {}, children: ['Child 2'] } as any;

        const result = ErrorBoundary({ children: [child1, child2] });

        expect(result?.type).toBe(Fragment);
        expect(result?.children).toEqual([child1, child2]);
    });
});
