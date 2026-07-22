// ─────────────────────────────────────────────────────
// @termuijs/router — Tests for Query String Routing
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Router } from './router.js';
import { parseQuery, serializeQuery } from './route.js';
import { useQueryParams, useNavigate } from './hooks.js';
import { unmountAll, type VNode } from '@termuijs/jsx';
import { render } from '@termuijs/testing';

const createMockVNode = (type: string = 'box'): VNode => {
    return {
        type,
        props: {},
        children: [],
    };
};

describe('Query String Utils', () => {
    it('parseQuery parses standard query strings', () => {
        expect(parseQuery('q=term&page=2')).toEqual({ q: 'term', page: '2' });
        expect(parseQuery('?q=term&page=2')).toEqual({ q: 'term', page: '2' });
    });

    it('parseQuery handles empty or missing query strings', () => {
        expect(parseQuery('')).toEqual({});
        expect(parseQuery('?')).toEqual({});
    });

    it('parseQuery handles special and URL-encoded characters', () => {
        expect(parseQuery('name=John%20Doe&msg=hello%2Bworld')).toEqual({
            name: 'John Doe',
            msg: 'hello+world',
        });
    });

    it('serializeQuery serializes query objects to a string', () => {
        expect(serializeQuery({ q: 'term', page: '2' })).toBe('q=term&page=2');
        expect(serializeQuery({})).toBe('');
    });

    it('serializeQuery URL-encodes special characters', () => {
        expect(serializeQuery({ name: 'John Doe', msg: 'hello+world' })).toBe(
            'name=John+Doe&msg=hello%2Bworld'
        );
    });
});

describe('Router Query Integration', () => {
    afterEach(() => {
        unmountAll();
        vi.restoreAllMocks();
    });

    it('Router parses query params from URL path during push', () => {
        const r = new Router();
        r.addRoute('/search', () => 'SearchScreen');
        
        r.push('/search?q=term&page=2');
        
        expect(r.currentPath).toBe('/search?q=term&page=2');
        expect(r.query).toEqual({ q: 'term', page: '2' });
    });

    it('Router handles multiple question marks in path correctly', () => {
        const r = new Router();
        r.addRoute('/search', () => 'SearchScreen');
        
        r.push('/search?q=what?&page=2');
        
        expect(r.currentPath).toBe('/search?q=what?&page=2');
        expect(r.query).toEqual({ q: 'what?', page: '2' });
    });

    it('Router serializes query object during push', () => {
        const r = new Router();
        r.addRoute('/search', () => 'SearchScreen');

        r.push('/search', { query: { q: 'term', page: '2' } });

        expect(r.currentPath).toBe('/search?q=term&page=2');
        expect(r.query).toEqual({ q: 'term', page: '2' });
    });

    it('Router serializes query object during replace', () => {
        const r = new Router();
        r.addRoute('/search', () => 'SearchScreen');

        r.replace('/search', { query: { q: 'term', page: '2' } });

        expect(r.currentPath).toBe('/search?q=term&page=2');
        expect(r.query).toEqual({ q: 'term', page: '2' });
    });

    it('Router appends query parameters when navigating with replace and an existing query string', () => {
        const r = new Router();
        r.addRoute('/search', () => 'SearchScreen');

        r.replace('/search?x=1', { query: { y: '2' } });

        expect(r.currentPath).toBe('/search?x=1&y=2');
        expect(r.query).toEqual({ x: '1', y: '2' });
    });

    it('useQueryParams returns the parsed query parameters in a component', () => {
        const r = new Router();
        let capturedQuery: Record<string, string> | null = null;

        const TestScreen = (): VNode => {
            capturedQuery = useQueryParams();
            return createMockVNode();
        };

        r.addRoute('/search', TestScreen);

        let screenToRender: VNode | undefined;
        r.events.on('navigate', (ev) => {
            screenToRender = ev.screen;
        });

        r.push('/search?q=term&page=2');
        if (!screenToRender) {
            throw new Error('Screen was not rendered');
        }
        const t = render(screenToRender);

        expect(capturedQuery).toEqual({ q: 'term', page: '2' });

        t.unmount();
    });

    it('useNavigate supports navigate with a query object option', () => {
        const r = new Router();
        let capturedNavigate: ReturnType<typeof useNavigate> | undefined;

        const StartScreen = (): VNode => {
            capturedNavigate = useNavigate();
            return createMockVNode();
        };

        r.addRoute('/start', StartScreen);
        r.addRoute('/search', () => createMockVNode());

        let screenToRender: VNode | undefined;
        r.events.on('navigate', (ev) => {
            screenToRender = ev.screen;
        });

        r.push('/start');
        if (!screenToRender) {
            throw new Error('Screen was not rendered');
        }
        const t = render(screenToRender);

        expect(capturedNavigate).toBeDefined();
        capturedNavigate!('/search', { query: { q: 'react', sort: 'desc' } });

        expect(r.currentPath).toBe('/search?q=react&sort=desc');
        expect(r.query).toEqual({ q: 'react', sort: 'desc' });

        t.unmount();
    });
});
