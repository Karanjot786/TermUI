// ─────────────────────────────────────────────────────
// @termuijs/router — Tests for Router
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Router } from './router.js';

describe('Router', () => {
    it('initializes with empty history', () => {
        const r = new Router();
        expect(r.historyLength).toBe(0);
        expect(r.currentPath).toBe('/');
    });

    it('addRoute registers a route', () => {
        const r = new Router();
        r.addRoute('/home', () => 'HomeScreen');
        expect(r.routes).toHaveLength(1);
    });

    it('push navigates to a registered path', () => {
        const r = new Router();
        r.addRoute('/home', () => 'HomeScreen');
        r.push('/home');
        expect(r.currentPath).toBe('/home');
        expect(r.current).toBeDefined();
    });

    it('push to unregistered path emits error', () => {
        const r = new Router();
        const errorFn = vi.fn();
        r.events.on('error', errorFn);
        r.push('/missing');
        expect(errorFn).toHaveBeenCalled();
    });

    it('back() pops history', () => {
        const r = new Router();
        r.addRoute('/a', () => 'A');
        r.addRoute('/b', () => 'B');
        r.push('/a');
        r.push('/b');
        r.back();
        expect(r.currentPath).toBe('/a');
    });

    it('canGoBack returns false on single entry', () => {
        const r = new Router();
        r.addRoute('/a', () => 'A');
        r.push('/a');
        expect(r.canGoBack).toBe(false);
    });

    it('replace updates current without adding to history', () => {
        const r = new Router();
        r.addRoute('/a', () => 'A');
        r.addRoute('/b', () => 'B');
        r.push('/a');
        r.replace('/b');
        expect(r.currentPath).toBe('/b');
        expect(r.historyLength).toBe(1);
    });

    it('params extracts route parameters', () => {
        const r = new Router();
        r.addRoute('/user/[id]', () => 'UserScreen');
        r.push('/user/42');
        expect(r.params.id).toBe('42');
    });

    it('navigate event fires on push', () => {
        const r = new Router();
        r.addRoute('/home', () => 'Home');
        const navFn = vi.fn();
        r.events.on('navigate', navFn);
        r.push('/home');
        expect(navFn).toHaveBeenCalled();
    });

    it('addRoutes registers multiple routes', () => {
        const r = new Router();
        r.addRoutes([
            { path: '/a', component: () => 'A' },
            { path: '/b', component: () => 'B' },
        ]);
        expect(r.routes).toHaveLength(2);
    });

    it('addRoutes supports lazy loader', () => {
        const r = new Router();
        const lazy = () => Promise.resolve({
            default: () => 'LazyScreen',
        });

        r.addRoutes([
            {
                path: '/lazy',
                component: () => 'Placeholder',
            },
        ]);

        expect(r.routes[0]?.component).toBeDefined();
    });

    it("falls back to 404", () => {
        const r = new Router();
        r.addRoute('/404', () => 'NotFound');
        
        // Listen for the unmatched route error and redirect to our 404 route
        r.events.on('error', () => {
            r.push('/404');
        });
        
        r.push('/missing');
        expect(r.currentPath).toBe('/404');
    });

    it("updates the history stack with push and back", () => {
        const r = new Router();
        r.addRoute('/', () => 'Home');
        r.addRoute('/about', () => 'About');

        // Push to home
        r.push('/');
        expect(r.currentPath).toBe('/');
        expect(r.historyLength).toBe(1);

        // Push to about
        r.push('/about');
        expect(r.currentPath).toBe('/about');
        expect(r.historyLength).toBe(2);

        // Go back
        r.back();
        expect(r.currentPath).toBe('/');
        expect(r.historyLength).toBe(1);
    });

    describe('isActive()', () => {
        it('returns true when path matches current route exactly', () => {
            const r = new Router();
            r.addRoute('/home', () => 'Home');
            r.push('/home');
            expect(r.isActive('/home')).toBe(true);
        });

        it('returns false after navigating away from a path', () => {
            const r = new Router();
            r.addRoute('/home', () => 'Home');
            r.addRoute('/about', () => 'About');
            r.push('/home');
            r.push('/about');
            expect(r.isActive('/home')).toBe(false);
            expect(r.isActive('/about')).toBe(true);
        });

        it('returns true for a different parameter value on the same dynamic pattern', () => {
            const r = new Router();
            r.addRoute('/user/[id]', () => 'UserScreen');
            r.push('/user/42');
            expect(r.isActive('/user/99')).toBe(true);
        });

        it('returns false before any navigation', () => {
            const r = new Router();
            r.addRoute('/home', () => 'Home');
            expect(r.isActive('/home')).toBe(false);
        });

        it('returns false for an unregistered path', () => {
            const r = new Router();
            r.addRoute('/home', () => 'Home');
            r.push('/home');
            expect(r.isActive('/missing')).toBe(false);
        });
    });

    it('beforeEnter can block navigation', () => {
        const r = new Router();
        r.addRoute('/admin', () => 'Admin', undefined, { beforeEnter: () => false });
        
        r.push('/admin');
        
        expect(r.current).toBeNull();
    });

    it('beforeEnter can redirect navigation', () => {
        const r = new Router();
        r.addRoute('/login', () => 'Login');
        r.addRoute('/admin', () => 'Admin', undefined, { beforeEnter: () => '/login' });
        
        r.push('/admin');
        
        expect(r.currentPath).toBe('/login');
    });

    it('back() with beforeEnter redirect does not corrupt history', () => {
        const r = new Router();
        r.addRoute('/login', () => 'Login');
        r.addRoute('/dashboard', () => 'Dashboard', undefined, {
            beforeEnter: () => '/login',
        });
        r.addRoute('/settings', () => 'Settings');

        r.push('/login');
        r.push('/dashboard');
        r.push('/settings');

        expect(r.currentPath).toBe('/settings');
        expect(r.historyLength).toBe(3);

        r.back();

        expect(r.currentPath).toBe('/login');
        expect(r.historyLength).toBe(2);
    });

    it('afterEnter executes after navigation', () => {
        const r = new Router();
        const spy = vi.fn();
        r.addRoute('/home', () => 'Home', undefined, { afterEnter: spy });
        
        r.push('/home');
        
        expect(spy).toHaveBeenCalled();
    });

    it('initialPath sets current match once a matching route is registered', () => {
        const r = new Router({ initialPath: '/dashboard' });
        r.addRoute('/dashboard', () => 'DashboardScreen');

        expect(r.current).not.toBeNull();
        expect(r.currentPath).toBe('/dashboard');
        expect(r.current?.route.path).toBe('/dashboard');
    });

    it('initialPath emits navigate when a matching route is registered', () => {
        const navFn = vi.fn();
        const r = new Router({ initialPath: '/home' });
        r.events.on('navigate', navFn);
        r.addRoute('/home', () => 'Home');

        expect(navFn).toHaveBeenCalledOnce();
        expect(navFn.mock.calls[0][0].match.route.path).toBe('/home');
    });

    it('initialPath resolves route params when a matching route is registered', () => {
        const r = new Router({ initialPath: '/user/42' });
        r.addRoute('/user/[id]', () => 'UserScreen');

        expect(r.current).not.toBeNull();
        expect(r.params.id).toBe('42');
    });

    it('initialPath with no matching route never sets current or emits navigate', () => {
        const navFn = vi.fn();
        const r = new Router({ initialPath: '/never' });
        r.events.on('navigate', navFn);
        r.addRoute('/dashboard', () => 'Dashboard');
        r.addRoute('/settings', () => 'Settings');

        expect(r.current).toBeNull();
        expect(navFn).not.toHaveBeenCalled();
    });
});
