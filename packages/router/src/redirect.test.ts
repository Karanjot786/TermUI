import { describe, it, expect, vi } from 'vitest';
import { Router } from './router.js';

describe('Router redirects', () => {
    it('static redirect lands on target', () => {
        const router = new Router();

        router.addRoute(
            '/old',
            () => null,
            undefined,
            undefined,
            undefined,
            '/new',
        );

        router.addRoute('/new', () => null);

        router.push('/old');

        expect(router.currentPath).toBe('/new');
    });

    it('function redirect uses params', () => {
        const router = new Router();

        router.addRoute(
            '/users/[id]',
            () => null,
            undefined,
            undefined,
            undefined,
            params => `/profile/${params.id}`,
        );

        router.addRoute('/profile/[id]', () => null);

        router.push('/users/42');

        expect(router.currentPath).toBe('/profile/42');
    });

    it('redirect resolves under replace', () => {
        const router = new Router();

        router.addRoute(
            '/home',
            () => null,
            undefined,
            undefined,
            undefined,
            '/dashboard',
        );

        router.addRoute('/dashboard', () => null);

        router.replace('/home');

        expect(router.currentPath).toBe('/dashboard');
    });

    it('redirect chain follows to a final route', () => {
        const router = new Router();

        router.addRoute(
            '/a',
            () => null,
            undefined,
            undefined,
            undefined,
            '/b',
        );

        router.addRoute(
            '/b',
            () => null,
            undefined,
            undefined,
            undefined,
            '/c',
        );

        router.addRoute('/c', () => null);

        router.push('/a');

        expect(router.currentPath).toBe('/c');
    });

    it('cyclic redirect emits error', () => {
        const router = new Router();

        const onError = vi.fn();

        router.events.on('error', onError);

        router.addRoute(
            '/a',
            () => null,
            undefined,
            undefined,
            undefined,
            '/b',
        );

        router.addRoute(
            '/b',
            () => null,
            undefined,
            undefined,
            undefined,
            '/a',
        );

        router.push('/a');

        expect(onError).toHaveBeenCalled();
    });
});