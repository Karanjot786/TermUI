// ─────────────────────────────────────────────────────
// @termuijs/router — Tests for Hooks
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Router } from './router.js';
import { useParams, useNavigate } from './hooks.js';
import { unmountAll } from '@termuijs/jsx';
import { render } from '@termuijs/testing';

describe('Router hooks', () => {
    afterEach(() => {
        unmountAll();
        vi.restoreAllMocks();
    });

    it('useParams returns params from current route (happy path)', () => {
        const r = new Router();
        let capturedParams: any; // captured from JSX hook; type depends on runtime route params

        const TestScreen = () => {
            capturedParams = useParams();
            return { type: 'box', props: {}, children: [] } as any; // VNode literal satisfies shape at runtime
        };

        r.addRoute('/user/[id]/post/[postId]', TestScreen);

        let screenToRender: any; // screen factory return varies by route component
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });
        
        r.push('/user/42/post/100');
        
        const t = render(screenToRender);

        expect(capturedParams).toBeDefined();
        expect(capturedParams.id).toBe('42');
        expect(capturedParams.postId).toBe('100');
        
        t.unmount();
    });

    it('useNavigate allows pushing to new route (happy path)', () => {
        const r = new Router();
        let capturedNavigate: any; // navigate fn type is private to router internals

        const TestScreen = () => {
            capturedNavigate = useNavigate();
            return { type: 'box', props: {}, children: [] } as any; // VNode literal satisfies shape at runtime
        };

        r.addRoute('/start', TestScreen);
        r.addRoute('/end', () => ({ type: 'box', props: {}, children: [] } as any)); // VNode literal satisfies shape at runtime

        let screenToRender: any; // screen factory return varies by route component
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });

        r.push('/start');
        const t = render(screenToRender);
        
        expect(capturedNavigate).toBeDefined();
        capturedNavigate('/end');
        
        expect(r.currentPath).toBe('/end');
        
        t.unmount();
    });

    it('useNavigate allows replacing current route', () => {
        const r = new Router();
        let capturedNavigate: any; // navigate fn type is private to router internals

        const TestScreen = () => {
            capturedNavigate = useNavigate();
            return { type: 'box', props: {}, children: [] } as any; // VNode literal satisfies shape at runtime
        };

        r.addRoute('/a', TestScreen);
        r.addRoute('/b', () => ({ type: 'box', props: {}, children: [] } as any)); // VNode literal satisfies shape at runtime

        let screenToRender: any; // screen factory return varies by route component
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });

        r.push('/a');
        const t = render(screenToRender);
        
        const initialHistoryLength = r.historyLength;
        
        capturedNavigate('/b', { replace: true });
        
        expect(r.currentPath).toBe('/b');
        expect(r.historyLength).toBe(initialHistoryLength);
        
        t.unmount();
    });

    it('handles edge cases gracefully (empty input does not throw)', () => {
        const r = new Router();
        let capturedParams: any; // captured from JSX hook; type depends on runtime route params
        let capturedNavigate: any; // navigate fn type is private to router internals

        const TestScreen = () => {
            capturedParams = useParams();
            capturedNavigate = useNavigate();
            return { type: 'box', props: {}, children: [] } as any; // VNode literal satisfies shape at runtime
        };

        // Static route (no params)
        r.addRoute('/', TestScreen);

        let screenToRender: any; // screen factory return varies by route component
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });

        r.push('/');
        const t = render(screenToRender);

        // Params should be an empty object, not undefined/null
        expect(capturedParams).toEqual({});

        // Calling navigate with empty input or boundary values
        expect(() => {
            capturedNavigate('');
        }).not.toThrow();
        
        expect(() => {
            // Not a real route, but router.push handles it by emitting 'error'
            capturedNavigate('/unknown-route');
        }).not.toThrow();
        
        t.unmount();
    });

    it('useNavigate warns when called without a router context', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        // Component that calls useNavigate inside a Router context
        let capturedNavigate: any;
        const TestComponent = () => {
            capturedNavigate = useNavigate();
            return { type: 'box', props: {}, children: [] } as any;
        };

        // Create VNode manually so render() calls the component via reconcile/renderComponent
        const vnode: any = { type: TestComponent, props: {}, children: [] };

        // Render outside a Router context (no RouterContext.Provider in the tree)
        const t = render(vnode);

        // capturedNavigate should be set by the component rendering
        // (it captures the navigate function via closure)
        expect(typeof capturedNavigate).toBe('function');

        // Calling navigate with no router context should warn
        capturedNavigate('/some-route');

        expect(warn).toHaveBeenCalledOnce();
        expect(warn).toHaveBeenCalledWith(
            '[useNavigate] No Router context found. ' +
            'Ensure your component is rendered inside a <Router>.'
        );

        t.unmount();
    });
});
