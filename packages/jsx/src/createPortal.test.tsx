import { describe, it, expect } from 'vitest';
import { Box, Text } from '@termuijs/widgets';
import { createPortal } from './createPortal.js';
import { useState, setRequestRender } from './hooks.js';
import { createElement as h } from './createElement.js';
import { reconcile, reRenderComponent } from './reconciler.js';

describe('createPortal', () => {
    it('renders node at target instead of inline', () => {
        const overlayRoot = new Box({ id: 'overlay' });

        function App() {
            return h(
                'box',
                { id: 'main' },
                h('text', {}, 'inline content'),
                createPortal(h('text', {}, 'portal content'), overlayRoot)
            );
        }

        const widget = reconcile(h(App, {})) as Box;

        // The inline tree should only have the inline text
        // (Wait, `reconcile` returns the root widget, we can check children)
        expect(widget.children.length).toBe(2);
        expect((widget.children[0] as Text).getContent()).toBe('inline content');

        // The overlay root should have the portal content
        expect(overlayRoot.children.length).toBe(1);
        expect((overlayRoot.children[0] as Text).getContent()).toBe('portal content');
    });

    it('updates portal content on re-render', () => {
        const overlayRoot = new Box({ id: 'overlay' });

        function App() {
            const [count, setCount] = useState(0);

            if (count === 0) {
                setTimeout(() => setCount(1), 10);
            }

            return h(
                'box',
                {},
                createPortal(h('text', {}, `count is ${count}`), overlayRoot)
            );
        }

        const rootWidget = reconcile(h(App, {}));
        const instances: Map<Widget, any> = (globalThis as any).__termuijs_instances;
        const rootInstance = instances?.get(rootWidget);

        // Mock requestRender so state updates trigger a re-render in our manual test
        setRequestRender(() => {
            if (rootInstance) {
                reRenderComponent(rootInstance);
            }
        });

        // Initial render
        expect((overlayRoot.children[0] as Text).getContent()).toBe('count is 0');

        // Re-render
        return new Promise<void>(resolve => {
            setTimeout(() => {
                expect(overlayRoot.children.length).toBe(1); // Clears previous!
                expect((overlayRoot.children[0] as Text).getContent()).toBe('count is 1');
                
                // Cleanup mock
                setRequestRender(() => {});
                resolve();
            }, 50);
        });
    });
});
