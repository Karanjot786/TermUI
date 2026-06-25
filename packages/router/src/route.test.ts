import { describe, it, expect } from 'vitest';
import {
    parseQuery,
    serializeQuery,
    compilePattern,
    matchRoute,
} from './route.js';
import type { Route } from './route.js';

describe('route - Query Utilities', () => {
    describe('parseQuery', () => {
        it('handles empty query string', () => {
            expect(parseQuery('')).toEqual({});
        });

        it('parses single query parameter', () => {
            expect(parseQuery('foo=bar')).toEqual({ foo: 'bar' });
        });

        it('parses multiple query parameters', () => {
            expect(parseQuery('foo=bar&baz=qux')).toEqual({ foo: 'bar', baz: 'qux' });
        });

        it('decodes URL-encoded parameters', () => {
            expect(parseQuery('hello=world%21&key%20space=value')).toEqual({
                hello: 'world!',
                'key space': 'value',
            });
        });
    });

    describe('serializeQuery', () => {
        it('handles empty query object', () => {
            expect(serializeQuery({})).toBe('');
        });

        it('serializes single query parameter', () => {
            expect(serializeQuery({ foo: 'bar' })).toBe('foo=bar');
        });

        it('serializes multiple query parameters', () => {
            expect(serializeQuery({ foo: 'bar', baz: 'qux' })).toBe('foo=bar&baz=qux');
        });

        it('URL-encodes parameters during serialization', () => {
            expect(serializeQuery({ hello: 'world!', 'key space': 'value' })).toBe(
                'hello=world%21&key+space=value'
            );
        });
    });
});

describe('route - compilePattern', () => {
    it('compiles root route pattern', () => {
        const { pattern, paramNames } = compilePattern('/');
        expect(pattern.test('/')).toBe(true);
        expect(pattern.test('/not-root')).toBe(false);
        expect(paramNames).toEqual([]);
    });

    it('compiles static route pattern', () => {
        const { pattern, paramNames } = compilePattern('/settings/profile');
        expect(pattern.test('/settings/profile')).toBe(true);
        expect(pattern.test('/settings/profile/')).toBe(true);
        expect(pattern.test('/settings/other')).toBe(false);
        expect(paramNames).toEqual([]);
    });

    it('compiles dynamic route segment', () => {
        const { pattern, paramNames } = compilePattern('/users/[id]/edit');
        expect(paramNames).toEqual(['id']);
        expect(pattern.test('/users/123/edit')).toBe(true);
        expect(pattern.test('/users/john-doe/edit')).toBe(true);
        expect(pattern.test('/users//edit')).toBe(false);
        
        const match = pattern.exec('/users/456/edit');
        expect(match?.[1]).toBe('456');
    });

    it('compiles wildcard/catch-all segment', () => {
        const { pattern, paramNames } = compilePattern('/files/[...path]');
        expect(paramNames).toEqual(['path']);
        expect(pattern.test('/files/documents/2026/report.pdf')).toBe(true);
        expect(pattern.test('/files/')).toBe(false);

        const match = pattern.exec('/files/documents/2026/report.pdf');
        expect(match?.[1]).toBe('documents/2026/report.pdf');
    });
});

describe('route - matchRoute', () => {
    const mockComponent = () => null;
    const routes: Route[] = [
        {
            path: '/',
            component: mockComponent,
            meta: { name: 'home' },
        },
        {
            path: '/about',
            component: mockComponent,
            meta: { name: 'about' },
        },
        {
            path: '/users/[id]',
            component: mockComponent,
            meta: { name: 'user-detail' },
            children: [
                {
                    path: 'posts',
                    component: mockComponent,
                    meta: { name: 'user-posts' },
                },
                {
                    path: '/users/[id]/settings', // absolute path in nested route
                    component: mockComponent,
                    meta: { name: 'user-settings' },
                }
            ],
        },
        {
            path: '/docs/[...slug]',
            component: mockComponent,
            meta: { name: 'docs' },
        },
    ];

    it('returns null when no route matches', () => {
        expect(matchRoute('/non-existent', routes)).toBeNull();
    });

    it('matches root route', () => {
        const match = matchRoute('/', routes);
        expect(match).not.toBeNull();
        expect(match?.route.meta?.name).toBe('home');
        expect(match?.params).toEqual({});
        expect(match?.query).toEqual({});
    });

    it('matches static route', () => {
        const match = matchRoute('/about', routes);
        expect(match?.route.meta?.name).toBe('about');
    });

    it('matches dynamic route and parses params', () => {
        const match = matchRoute('/users/42', routes);
        expect(match?.route.meta?.name).toBe('user-detail');
        expect(match?.params).toEqual({ id: '42' });
    });

    it('matches nested relative route and sets chain and params', () => {
        const match = matchRoute('/users/42/posts', routes);
        expect(match?.route.meta?.name).toBe('user-posts');
        expect(match?.params).toEqual({ id: '42' });
        expect(match?.chain).toHaveLength(2);
        expect(match?.chain[0].meta?.name).toBe('user-detail');
        expect(match?.chain[1].meta?.name).toBe('user-posts');
    });

    it('matches nested absolute route correctly', () => {
        const match = matchRoute('/users/42/settings', routes);
        expect(match?.route.meta?.name).toBe('user-settings');
        expect(match?.params).toEqual({ id: '42' });
    });

    it('matches wildcard route and parses catch-all params', () => {
        const match = matchRoute('/docs/guide/getting-started', routes);
        expect(match?.route.meta?.name).toBe('docs');
        expect(match?.params).toEqual({ slug: 'guide/getting-started' });
    });

    it('parses query parameters in route match', () => {
        const match = matchRoute('/about?tab=settings&theme=dark', routes);
        expect(match?.route.meta?.name).toBe('about');
        expect(match?.query).toEqual({ tab: 'settings', theme: 'dark' });
    });
});
