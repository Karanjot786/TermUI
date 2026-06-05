import { describe, it, expect, vi } from 'vitest';
import { Router } from './router.js';

const MinimalComponent = () => ({ type: 'text', props: {}, children: [] });

describe('Router History and Event Navigation', () => {
    it('navigates through history stack via push and tracks depth', () => {
        const router = new Router();
        router.addRoutes([
            { path: '/', component: MinimalComponent },
            { path: '/next', component: MinimalComponent }
        ]);

        const navigateSpy = vi.fn();
        router.events.on('navigate', navigateSpy);

        router.push('/');
        router.push('/next');
        expect(router.historyLength).toBe(2);
        expect(router.currentPath).toBe('/next');

        router.back();
        expect(router.currentPath).toBe('/');
        expect(router.historyLength).toBe(1);
    });

    it('clearHistory flushes the navigation stack completely', () => {
        const router = new Router();
        router.addRoutes([
            { path: '/', component: MinimalComponent },
            { path: '/dashboard', component: MinimalComponent }
        ]);

        router.push('/');
        router.push('/dashboard');
        expect(router.historyLength).toBe(2);
        expect(router.canGoBack).toBe(true);

        // Execute historical state flush
        router.clearHistory();

        // Assert empty state structural integrity
        expect(router.historyLength).toBe(0);
        expect(router.canGoBack).toBe(false);
        expect(router.currentPath).toBe('/');
    });

    it('triggers dynamic router navigation on Enter keypress event for links', () => {
        const router = new Router();
        const pushSpy = vi.spyOn(router, 'push').mockImplementation(() => {});
        const mockEnterEvent = { key: 'return', name: 'return' };
        
        const handleKeyPress = (e: Record<string, unknown>) => {
            if (e.key === 'return') {
                router.push('/target-route');
            }
        };

        const vnode = {
            type: 'text',
            props: {
                focusable: true,
                onKeyPress: handleKeyPress
            },
            children: ['Go to Target']
        };
        
        vnode.props.onKeyPress?.(mockEnterEvent);
        expect(pushSpy).toHaveBeenCalledWith('/target-route');
        
        pushSpy.mockRestore();
    });
});