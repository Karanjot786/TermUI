import { describe, it, expect, vi } from 'vitest';
import { Router } from './router.js';

describe('Router Async Middleware & Data Resolvers', () => {
    it('executes global async middlewares sequentially in order', async () => {
        const order: string[] = [];
        const router = new Router();

        router.use(async () => {
            order.push('mw1-start');
            await new Promise((r) => setTimeout(r, 10));
            order.push('mw1-end');
        });

        router.use(async () => {
            order.push('mw2-start');
            await new Promise((r) => setTimeout(r, 10));
            order.push('mw2-end');
        });

        router.addRoute('/', () => null);
        router.addRoute('/dashboard', () => null);

        router.push('/dashboard');
        await new Promise((r) => setTimeout(r, 50));

        expect(order).toEqual(['mw1-start', 'mw1-end', 'mw2-start', 'mw2-end']);
    });

    it('allows middleware to block navigation by returning false', async () => {
        const router = new Router();

        router.use(async (to) => {
            if (to === '/admin') return false;
            return true;
        });

        router.addRoute('/', () => null);
        router.addRoute('/admin', () => null);

        router.push('/');
        await new Promise((r) => setTimeout(r, 10));
        expect(router.currentPath).toBe('/');

        router.push('/admin');
        await new Promise((r) => setTimeout(r, 10));
        expect(router.currentPath).toBe('/');
    });

    it('allows middleware to redirect navigation by returning a target path string', async () => {
        const router = new Router();

        router.use(async (to) => {
            if (to === '/protected') return '/login';
            return true;
        });

        router.addRoute('/login', () => null);
        router.addRoute('/protected', () => null);

        router.push('/protected');
        await new Promise((r) => setTimeout(r, 20));

        expect(router.currentPath).toBe('/login');
    });

    it('pre-fetches route data using resolve map and populates component props', async () => {
        const router = new Router();

        const userResolver = vi.fn(async () => {
            await new Promise((r) => setTimeout(r, 15));
            return { id: 42, name: 'Alice' };
        });

        router.addRoute('/profile/[id]', (props: any) => props, {
            resolve: {
                user: userResolver,
            },
        });

        router.push('/profile/42');
        await new Promise((r) => setTimeout(r, 40));

        expect(userResolver).toHaveBeenCalled();
        expect(router.current).not.toBeNull();
        expect(router.current?.resolvedData).toEqual({
            user: { id: 42, name: 'Alice' },
        });
    });

    it('cancels stale navigation requests when rapid navigation events occur', async () => {
        const router = new Router();

        router.use(async (to) => {
            if (to === '/slow') {
                await new Promise((r) => setTimeout(r, 100));
            }
        });

        router.addRoute('/fast', () => null);
        router.addRoute('/slow', () => null);

        router.push('/slow');
        // Instantly push fast navigation while slow is still in-flight
        router.push('/fast');

        await new Promise((r) => setTimeout(r, 120));

        expect(router.currentPath).toBe('/fast');
    });
});
