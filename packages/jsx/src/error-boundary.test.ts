// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for ErrorBoundary
// ─────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { ErrorBoundary, clearWidgetRenderError, hasWidgetRenderError } from './error-boundary.js';
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

describe('clearWidgetRenderError utility', () => {
    class MockWidget extends Widget {
        _renderError: Error | null = null;
        _children: MockWidget[] = [];

        constructor(renderError: Error | null = null, children: MockWidget[] = []) {
            super();
            this._renderError = renderError;
            this._children = children;
        }
    }

    it('clears the render error on a single widget', () => {
        const err = new Error('Root error');
        const root = new MockWidget(err);

        clearWidgetRenderError(root);

        expect(root._renderError).toBeNull();
        expect(hasWidgetRenderError(root)).toBeNull();
    });

    it('recursively clears render errors on nested children', () => {
        const leafErr = new Error('Leaf error');
        const childErr = new Error('Child error');
        const rootErr = new Error('Root error');

        const leaf = new MockWidget(leafErr);
        const child1 = new MockWidget(childErr, [leaf]);
        const child2 = new MockWidget(null);
        const root = new MockWidget(rootErr, [child1, child2]);

        clearWidgetRenderError(root);

        expect(root._renderError).toBeNull();
        expect(child1._renderError).toBeNull();
        expect(child2._renderError).toBeNull();
        expect(leaf._renderError).toBeNull();
        expect(hasWidgetRenderError(root)).toBeNull();
    });
});
