// ─────────────────────────────────────────────────────
// @termuijs/router — Tests for Route Meta Fields
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Router } from './router.js';
import { useRouteMeta } from './hooks.js';
import { matchRoute } from './route.js';
import { unmountAll } from '@termuijs/jsx';
import { render } from '@termuijs/testing';

describe('Router meta fields', () => {
    afterEach(() => {
        unmountAll();
        vi.restoreAllMocks();
    });

    it('addRoute stores meta on the route', () => {
        const r = new Router();
        r.addRoute('/home', () => 'Home', undefined, undefined, { title: 'Home', auth: true });
        
        expect(r.routes[0]?.meta).toEqual({ title: 'Home', auth: true });
    });

    it('addRoutes accepts per-entry meta', () => {
        const r = new Router();
        r.addRoutes([
            {
                path: '/dashboard',
                component: () => 'Dashboard',
                meta: { title: 'Dashboard', roles: ['admin'] },
            },
            {
                path: '/settings',
                component: () => 'Settings',
            }
        ]);

        expect(r.routes[0]?.meta).toEqual({ title: 'Dashboard', roles: ['admin'] });
        expect(r.routes[1]?.meta).toEqual({});
    });

    it('active match exposes meta', () => {
        const r = new Router();
        r.addRoute('/home', () => 'Home', undefined, undefined, { title: 'Home' });
        r.push('/home');

        expect(r.current).toBeDefined();
        expect(r.current?.route.meta).toEqual({ title: 'Home' });
        expect(r.current?.meta).toEqual({ title: 'Home' });
    });

    it('route without meta yields empty object', () => {
        const r = new Router();
        r.addRoute('/home', () => 'Home');
        r.push('/home');

        expect(r.routes[0]?.meta).toEqual({});
        expect(r.current?.route.meta).toEqual({});
        expect(r.current?.meta).toEqual({});
    });

    it('useRouteMeta hook returns current route meta', () => {
        const r = new Router();
        let capturedMeta: any;

        const TestScreen = () => {
            capturedMeta = useRouteMeta();
            return { type: 'box', props: {}, children: [] } as any;
        };

        r.addRoute('/home', TestScreen, undefined, undefined, { title: 'Home' });
        
        let screenToRender: any;
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });
        
        r.push('/home');
        
        const t = render(screenToRender);

        expect(capturedMeta).toBeDefined();
        expect(capturedMeta).toEqual({ title: 'Home' });
        
        t.unmount();
    });

    it('useRouteMeta returns empty object if no meta is defined', () => {
        const r = new Router();
        let capturedMeta: any;

        const TestScreen = () => {
            capturedMeta = useRouteMeta();
            return { type: 'box', props: {}, children: [] } as any;
        };

        r.addRoute('/about', TestScreen);
        
        let screenToRender: any;
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });
        
        r.push('/about');
        
        const t = render(screenToRender);

        expect(capturedMeta).toEqual({});
        
        t.unmount();
    });

    it('handles 5-argument form with children and options correctly', () => {
        const r = new Router();
        const beforeEnter = vi.fn().mockReturnValue(true);
        
        r.addRoute(
            '/dashboard',
            () => 'Dashboard',
            undefined,
            [{ path: '/dashboard/settings', component: () => 'Settings' }],
            { beforeEnter, title: 'Dashboard' } as any
        );

        expect(r.routes[0]?.beforeEnter).toBe(beforeEnter);
        expect(r.routes[0]?.meta).toEqual({ title: 'Dashboard' });
        expect((r.routes[0]?.meta as any).beforeEnter).toBeUndefined();
    });

    it('matchRoute does not mutate source route object', () => {
        const route = { path: '/test', component: () => 'Test' };
        const match = matchRoute('/test', [route]);

        expect(match).toBeDefined();
        expect(match?.meta).toEqual({});
        expect((route as any).meta).toBeUndefined();
    });
});
