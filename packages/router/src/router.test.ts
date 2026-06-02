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

    it('supports nested routes', () => {
        const r = new Router();

        r.addRoutes([
            {
                path: '/settings',
                component: () => 'Settings',
                children: [
                    {
                        path: 'profile',
                        component: () => 'Profile',
                    },
                ],
            },
        ]);

        r.push('/settings/profile');

        expect(r.current).not.toBeNull();
    });

    it('resolves full parent-to-leaf chain', () => {
        const r = new Router();

        r.addRoutes([
            {
                path: '/settings',
                component: () => 'Settings',
                children: [
                    {
                        path: 'profile',
                        component: () => 'Profile',
                    },
                ],
            },
        ]);

        r.push('/settings/profile');

        expect(r.current?.chain.length).toBe(2);
    });

    it('preserves params in nested routes', () => {
        const r = new Router();

        r.addRoutes([
            {
                path: '/users',
                component: () => 'Users',
                children: [
                    {
                        path: '[id]',
                        component: () => 'User',
                    },
                ],
            },
        ]);

        r.push('/users/42');

        expect(r.params.id).toBe('42');
    });
});