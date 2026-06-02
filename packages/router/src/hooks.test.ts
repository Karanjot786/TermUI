// ─────────────────────────────────────────────────────
// Tests — useParams and useNavigate hooks
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Router } from './router.js';
import { useParams, useNavigate } from './hooks.js';

// Track state across hook calls
const state: { params: Record<string, string>; cleanups: (() => void)[]; setter: ((v: any) => void) | null } = {
    params: {},
    cleanups: [],
    setter: null,
};

vi.mock('@termuijs/jsx', () => {
    let stored = {};
    let setter: ((v: any) => void) | null = null;
    const cleanups: (() => void)[] = [];
    let router: any = null;
    const ctxId = Symbol('ctx');

    return {
        createContext: (defaultValue: any) => ({
            _id: ctxId,
            Provider: ({ value, children }: any) => {
                router = value;
                return children;
            },
            defaultValue,
        }),
        useContext: () => router,
        useState: (initial: any) => {
            stored = initial;
            setter = (val: any) => {
                stored = typeof val === 'function' ? val(stored) : val;
            };
            return [stored, setter];
        },
        useEffect: (fn: () => void | (() => void)) => {
            const cleanup = fn();
            if (typeof cleanup === 'function') cleanups.push(cleanup);
        },
        type: { Fiber: {} as any },
    };
});

describe('useParams', () => {
    let router: Router;

    beforeAll(() => {
        router = new Router();
        router.addRoute('/user/[id]', () => 'UserScreen');
        router.addRoute('/task/[tid]', () => 'TaskScreen');
        router.addRoute('/', () => 'HomeScreen');
    });

    it('returns empty object when router context is null (default)', () => {
        const params = useParams();
        expect(params).toEqual({});
    });

    it('reads params from router when available', () => {
        router.push('/user/42');
        const params = useParams();
        expect(params).toEqual({ id: '42' });
    });

    it('returns empty object for root route with no params', () => {
        const r = new Router();
        r.addRoute('/', () => 'Home');
        r.push('/');
        const params = useParams();
        expect(params).toEqual({});
    });

    it('handles catch-all segments', () => {
        const r = new Router();
        r.addRoute('/docs/[...slug]', () => 'Docs');
        r.push('/docs/getting-started/install');
        const params = useParams();
        expect(params.slug).toBe('getting-started/install');
    });
});

describe('useNavigate', () => {
    let router: Router;

    beforeAll(() => {
        router = new Router();
        router.addRoute('/a', () => 'A');
        router.addRoute('/b', () => 'B');
        router.addRoute('/c', () => 'C');
    });

    it('returns an object with push, replace, back, canGoBack', () => {
        const nav = useNavigate();
        expect(nav).toHaveProperty('push');
        expect(nav).toHaveProperty('replace');
        expect(nav).toHaveProperty('back');
        expect(nav).toHaveProperty('canGoBack');
    });

    it('push navigates to a registered route', () => {
        const nav = useNavigate();
        nav.push('/a');
        expect(router.currentPath).toBe('/a');
    });

    it('replace changes current path without increasing history length', () => {
        const r = new Router();
        r.addRoute('/a', () => 'A');
        r.addRoute('/b', () => 'B');
        r.addRoute('/c', () => 'C');
        r.push('/a');
        r.push('/b');
        expect(r.historyLength).toBe(2);
        r.replace('/c');
        expect(r.currentPath).toBe('/c');
        expect(r.historyLength).toBe(2);
    });

    it('back returns to previous route', () => {
        const r = new Router();
        r.addRoute('/a', () => 'A');
        r.addRoute('/b', () => 'B');
        r.push('/a');
        r.push('/b');
        r.back();
        expect(r.currentPath).toBe('/a');
    });

    it('canGoBack reflects history depth', () => {
        const r = new Router();
        r.addRoute('/a', () => 'A');
        r.addRoute('/b', () => 'B');
        expect(r.canGoBack).toBe(false);
        r.push('/a');
        expect(r.canGoBack).toBe(false);
        r.push('/b');
        expect(r.canGoBack).toBe(true);
        r.back();
        expect(r.canGoBack).toBe(false);
    });
});

describe('Router events (integration)', () => {
    it('emits navigate event on push', () => {
        const r = new Router();
        r.addRoute('/home', () => 'Home');
        const fn = vi.fn();
        r.events.on('navigate', fn);
        r.push('/home');
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith(
            expect.objectContaining({ match: expect.anything(), screen: expect.anything() })
        );
    });

    it('emits error event on push to unregistered path', () => {
        const r = new Router();
        const fn = vi.fn();
        r.events.on('error', fn);
        r.push('/missing');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('emits back event on back navigation', () => {
        const r = new Router();
        r.addRoute('/a', () => 'A');
        r.addRoute('/b', () => 'B');
        r.push('/a');
        r.push('/b');
        const fn = vi.fn();
        r.events.on('back', fn);
        r.back();
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
