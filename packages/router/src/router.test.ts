// ─────────────────────────────────────────────────────
// @termuijs/router — Tests for Router
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Router } from './router.js';

describe('Router', () => {
    const MinimalComponent = () => ({ type: 'text', props: {}, children: [] });

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

    it('beforeEnter can block navigation', () => {
        const r = new Router();
        r.addRoute('/admin', () => 'Admin');
        (r.routes[0] as any).beforeEnter = () => false;
        r.push('/admin');
        expect(r.current).toBeNull();
    });

    it('beforeEnter can redirect navigation', () => {
        const r = new Router();
        r.addRoute('/login', () => 'Login');
        r.addRoute('/admin', () => 'Admin');
        (r.routes[1] as any).beforeEnter = () => '/login';
        r.push('/admin');
        expect(r.currentPath).toBe('/login');
    });

    it('afterEnter executes after navigation', () => {
        const r = new Router();
        const spy = vi.fn();
        r.addRoute('/home', () => 'Home');
        (r.routes[0] as any).afterEnter = spy;
        r.push('/home');
        expect(spy).toHaveBeenCalled();
    });

    it('stores lazy loader on route', () => {
        const r = new Router();
        const lazy = () => Promise.resolve({
            default: () => 'LazyScreen',
        });
        r.addRoute(
            '/lazy',
            () => 'Placeholder',
            undefined,
            undefined,
            { beforeEnter: undefined, lazy } as any
        );
        expect(r.routes[0]?.lazy).toBe(lazy);
    });

    it('addRoutes supports lazy loader', () => {
        const r = new Router();
        r.addRoutes([
            {
                path: '/lazy',
                component: () => 'Placeholder',
            },
        ]);
        expect(r.routes[0]?.component).toBeDefined();
    });

    // 🌟 Public API Router.clearHistory() Method Testing Suite
    describe('clearHistory()', () => {
        it('should completely flush navigation vectors and history metrics', () => {
            const r = new Router();
            r.addRoute('/a', MinimalComponent);
            r.addRoute('/b', MinimalComponent);
            
            r.push('/a');
            r.push('/b');
            expect(r.historyLength).toBe(2);

            r.clearHistory();
            expect(r.historyLength).toBe(0);
            expect(r.current).toBeNull();
            expect(r.canGoBack).toBe(false);
        });
    });

    // 🌟 Public API Router.isActive() Method Testing Suite
    describe('isActive()', () => {
        it('should return true for exact static path string matches', () => {
            const r = new Router({ initialPath: '/dashboard' });
            r.addRoute('/dashboard', MinimalComponent);
            r.addRoute('/settings', MinimalComponent);

            r.push('/dashboard');

            expect(r.isActive('/dashboard')).toBe(true);
            expect(r.isActive('/settings')).toBe(false);
        });

        it('should evaluate true for paths matching active dynamic parameter routes', () => {
            const r = new Router({ initialPath: '/user/42' });
            r.addRoute('/user/[id]', MinimalComponent);

            r.push('/user/42');

            expect(r.isActive('/user/42')).toBe(true);
        });

        it('should return false for unmatched or non-existent route paths', () => {
            const r = new Router({ initialPath: '/' });
            r.addRoute('/', MinimalComponent);
            r.push('/');

            expect(r.isActive('/unknown-route-path')).toBe(false);
        });
    });
});