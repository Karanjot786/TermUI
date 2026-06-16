import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement } from './createElement.js';
import { reconcile, reRenderComponent, unmountAll } from './reconciler.js';
import { FocusContext } from './focus-context.js';
import { useFocus } from './hooks/useFocus.js';
import { useState } from './hooks.js';
import { autoBlurNode } from './focus_cleanup.js';

describe('focus cleanup & autoBlurNode integration', () => {
    let mockContextValue: {
        focused: string | null;
        focus: ReturnType<typeof vi.fn>;
        blur: ReturnType<typeof vi.fn>;
    };

    let originalInstances: any;

    beforeEach(() => {
        originalInstances = (globalThis as any).__termuijs_instances;
        mockContextValue = {
            focused: null,
            focus: vi.fn((id: string) => {
                mockContextValue.focused = id;
            }),
            blur: vi.fn(() => {
                mockContextValue.focused = null;
            }),
        };
        // Global instance map used by reconciler
        // Accessing global mapping for test assertions on widgets
        const instances = (globalThis as any).__termuijs_instances;
        if (instances instanceof Map) {
            instances.clear();
        }
    });

    afterEach(() => {
        unmountAll();
        vi.restoreAllMocks();
        // Restore global instances after test to prevent pollution
        // Accessing global mapping for test assertions on widgets
        (globalThis as any).__termuijs_instances = originalInstances;
    });

    it('clears focus on unmount if the unmounted node was focused', () => {
        let triggerUnmount!: () => void;

        function ChildComponent() {
            useFocus({ id: 'my-id' });
            return createElement('text', null, 'child');
        }

        function ParentComponent() {
            const [show, setShow] = useState(true);
            triggerUnmount = () => setShow(false);
            return createElement('box', null, show ? createElement(ChildComponent, null) : null);
        }

        function App() {
            return createElement(FocusContext.Provider, { value: mockContextValue }, createElement(ParentComponent, null));
        }

        const rootWidget = reconcile(createElement(App, null));
        
        // Simulate focusing the node
        mockContextValue.focused = 'my-id';

        // Retrieve instance to trigger re-render
        // Accessing global mapping for test assertions on widgets
        const instances = (globalThis as any).__termuijs_instances;
        const rootInstance = instances.get(rootWidget);

        // Trigger state change (unmount ChildComponent)
        triggerUnmount();
        reRenderComponent(rootInstance);

        // Verify that the focus cleanup blurred the unmounted node
        expect(mockContextValue.blur).toHaveBeenCalled();
    });

    it('does not clear focus on unmount if a different node is focused', () => {
        let triggerUnmount!: () => void;

        function ChildComponent() {
            useFocus({ id: 'my-id' });
            return createElement('text', null, 'child');
        }

        function ParentComponent() {
            const [show, setShow] = useState(true);
            triggerUnmount = () => setShow(false);
            return createElement('box', null, show ? createElement(ChildComponent, null) : null);
        }

        function App() {
            return createElement(FocusContext.Provider, { value: mockContextValue }, createElement(ParentComponent, null));
        }

        const rootWidget = reconcile(createElement(App, null));
        
        // Focus a different node
        mockContextValue.focused = 'other-id';

        // Accessing global mapping for test assertions on widgets
        const instances = (globalThis as any).__termuijs_instances;
        const rootInstance = instances.get(rootWidget);

        triggerUnmount();
        reRenderComponent(rootInstance);

        expect(mockContextValue.blur).not.toHaveBeenCalled();
    });

    it('falls back to routing focus to fallback deterministically if other widgets exist', () => {
        // Mock widget properties and instances
        const mockWidget1 = { id: 'child-id', focusable: true, parent: null };
        const mockWidget2 = { id: 'sibling-id', focusable: true, parent: null };

        const mockInstances = new Map();
        mockInstances.set(mockWidget1, { fiber: {} });
        mockInstances.set(mockWidget2, { fiber: {} });
        // Accessing global mapping for test assertions on widgets
        (globalThis as any).__termuijs_instances = mockInstances;

        mockContextValue.focused = 'child-id';

        autoBlurNode(mockContextValue, 'child-id');

        expect(mockContextValue.focus).toHaveBeenCalledWith('sibling-id');
    });
});
