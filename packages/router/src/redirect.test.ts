import { describe, it, expect, vi } from 'vitest';
import { Router } from './router.js';

const DummyComponent = () => ({ type: 'box', props: {}, children: [] } as any);

describe('Router Redirects', () => {
    it('handles static redirect', () => {
        const router = new Router();
        router.addRoute('/old', DummyComponent, undefined, undefined, undefined, '/new');
        router.addRoute('/new', DummyComponent);

        router.push('/old');
        expect(router.currentPath).toBe('/new');
    });

    it('handles function redirect', () => {
        const router = new Router();
        router.addRoute('/user/[id]', DummyComponent, undefined, undefined, undefined, (params) => `/profile/${params.id}`);
        router.addRoute('/profile/[id]', DummyComponent);

        router.push('/user/123');
        expect(router.currentPath).toBe('/profile/123');
        expect(router.params).toEqual({ id: '123' });
    });

    it('handles replace redirect', () => {
        const router = new Router();
        router.addRoute('/start', DummyComponent);
        router.addRoute('/old', DummyComponent, undefined, undefined, undefined, '/new');
        router.addRoute('/new', DummyComponent);

        router.push('/start');
        router.replace('/old');
        expect(router.currentPath).toBe('/new');
        expect(router.historyLength).toBe(1);
    });

    it('handles redirect chain', () => {
        const router = new Router();
        router.addRoute('/a', DummyComponent, undefined, undefined, undefined, '/b');
        router.addRoute('/b', DummyComponent, undefined, undefined, undefined, '/c');
        router.addRoute('/c', DummyComponent);

        router.push('/a');
        expect(router.currentPath).toBe('/c');
    });

    it('detects cyclic redirect and emits error', () => {
        const router = new Router();
        const errorHandler = vi.fn();
        router.events.on('error', errorHandler);

        router.addRoute('/a', DummyComponent, undefined, undefined, undefined, '/b');
        router.addRoute('/b', DummyComponent, undefined, undefined, undefined, '/a');

        router.push('/a');

        expect(errorHandler).toHaveBeenCalled();
        expect(errorHandler.mock.calls[0][0].message).toMatch(/Max redirect depth exceeded/);
    });
});