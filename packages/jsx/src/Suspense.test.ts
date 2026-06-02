import { describe, expect, it } from 'vitest';
import { createElement } from './createElement.js';
import { reconcile } from './reconciler.js';
import { setRequestRender } from './hooks.js';
import { lazy } from './lazy.js';
import { Suspense } from './Suspense.js';

function textContent(widget: any): string {
    if (typeof widget.getContent === 'function') return widget.getContent();
    if (typeof widget._content === 'string') return widget._content;
    if (typeof widget.text === 'string') return widget.text;
    if (typeof widget.content === 'string') return widget.content;

    const children = widget._children ?? widget.children ?? [];
    return children.map(textContent).join('');
}

describe('Suspense and lazy', () => {
    it('renders fallback while lazy component is pending, then renders loaded component', async () => {
        let resolveLoader!: (value: { default: any }) => void;
        let renderRequests = 0;
        let loaderCalls = 0;

        setRequestRender(() => {
            renderRequests++;
        });

        const Profile = lazy(() => {
            loaderCalls++;
            return new Promise<{ default: any }>((resolve) => {
                resolveLoader = resolve;
            });
        });

        function LoadedProfile() {
            return createElement('text', null, 'Profile loaded');
        }

        const element = createElement(
            Suspense as any,
            { fallback: createElement('text', null, 'Loading') },
            createElement(Profile, null),
        );

        const firstRender = reconcile(element);
        expect(textContent(firstRender)).toContain('Loading');
        expect(loaderCalls).toBe(1);

        resolveLoader({ default: LoadedProfile });
        await Promise.resolve();
        await Promise.resolve();

        expect(renderRequests).toBe(1);

        const secondRender = reconcile(element);
        expect(textContent(secondRender)).toContain('Profile loaded');
        expect(loaderCalls).toBe(1);

        setRequestRender(null);
    });
});