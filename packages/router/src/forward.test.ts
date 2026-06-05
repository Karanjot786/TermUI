import { describe, it, expect, vi } from 'vitest';
import { Router } from './router.js';

const MinimalComponent = () => ({ type: 'text', props: {}, children: [] });

describe('Router Forward Navigation', () => {
    it('forward re-navigates after back', () => {
        const router = new Router();
        router.addRoutes([
            { path: '/', component: MinimalComponent },
            { path: '/next', component: MinimalComponent }
        ]);

        const navigateSpy = vi.fn();
        router.events.on('navigate', navigateSpy);

        router.push('/');
        router.push('/next');
        router.back();
        
        expect(router.currentPath).toBe('/');
        router.forward();
        
        expect(router.currentPath).toBe('/next');
        expect(navigateSpy).toHaveBeenCalled();
    });

    it('push clears the forward stack', () => {
        const router = new Router();
        router.addRoutes([
            { path: '/', component: MinimalComponent },
            { path: '/page1', component: MinimalComponent },
            { path: '/page2', component: MinimalComponent }
        ]);

        router.push('/');
        router.push('/page1');
        router.back();
        expect(router.canGoForward).toBe(true);

        router.push('/page2');
        expect(router.canGoForward).toBe(false);
    });

    it('canGoForward reflects forward entries', () => {
        const router = new Router();
        router.addRoutes([
            { path: '/', component: MinimalComponent },
            { path: '/page1', component: MinimalComponent }
        ]);

        expect(router.canGoForward).toBe(false);
        router.push('/');
        router.push('/page1');
        router.back();
        expect(router.canGoForward).toBe(true);
    });

    it('go(-1) goes back and go(1) goes forward', () => {
        const router = new Router();
        router.addRoutes([
            { path: '/', component: MinimalComponent },
            { path: '/home', component: MinimalComponent }
        ]);

        router.push('/');
        router.push('/home');
        
        router.go(-1);
        expect(router.currentPath).toBe('/');

        router.go(1);
        expect(router.currentPath).toBe('/home');
    });

    it('go past the boundary is a no-op', () => {
        const router = new Router();
        router.addRoutes([
            { path: '/', component: MinimalComponent },
            { path: '/dashboard', component: MinimalComponent }
        ]);

        router.push('/');
        router.push('/dashboard');

        expect(() => router.go(-100)).not.toThrow();
        expect(router.currentPath).toBe('/dashboard');

        expect(() => router.go(50)).not.toThrow();
        expect(router.currentPath).toBe('/dashboard');
    });
});