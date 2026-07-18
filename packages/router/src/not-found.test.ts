// -----------------------------------------------------
// @termuijs/router - Tests for configurable not-found routes
// -----------------------------------------------------

import { afterEach, describe, expect, it, vi } from 'vitest';
import { isVElement, unmountAll, type VNode } from '@termuijs/jsx';
import { render, type TestInstance } from '@termuijs/testing';
import { Router } from './router.js';
import { RouterContext } from './hooks.js';

function notFound(path: string): VNode {
    return { type: 'text', props: {}, children: ['404 ' + path] };
}

let rendered: TestInstance | null = null;

afterEach(() => {
    rendered?.unmount();
    rendered = null;
    unmountAll();
    vi.restoreAllMocks();
});

describe('Router notFound', () => {
    it('renders notFound on unmatched path', () => {
        const router = new Router({ notFound });
        const navigate = vi.fn();
        const error = vi.fn();
        router.events.on('navigate', navigate);
        router.events.on('error', error);

        router.push('/missing');

        expect(navigate).toHaveBeenCalledOnce();
        expect(error).not.toHaveBeenCalled();
        expect(router.currentPath).toBe('/missing');
        expect(router.historyLength).toBe(1);

        rendered = render(navigate.mock.calls[0][0].screen);
        expect(rendered.getByText('404 /missing')).not.toBeNull();
    });

    it('notFound receives the attempted path', () => {
        const captured = vi.fn(notFound);
        const router = new Router({ notFound: captured });
        const navigate = vi.fn();
        router.events.on('navigate', navigate);

        router.push('/lost');

        rendered = render(navigate.mock.calls[0][0].screen);
        expect(captured).toHaveBeenCalledWith('/lost');
    });

    it('emits navigate with the 404 screen', () => {
        const router = new Router({ notFound });
        const navigate = vi.fn();
        const error = vi.fn();
        router.events.on('navigate', navigate);
        router.events.on('error', error);

        router.push('/gone');

        expect(navigate).toHaveBeenCalledOnce();
        expect(error).not.toHaveBeenCalled();

        const event = navigate.mock.calls[0][0];
        expect(event.match.route.path).toBe('/gone');
        expect(event.direction).toBe('push');
        expect(isVElement(event.screen)).toBe(true);
        if (!isVElement(event.screen)) {
            throw new Error('Expected 404 screen to be a wrapped element');
        }

        const provider = event.screen.children[0];
        expect(isVElement(provider)).toBe(true);
        if (!isVElement(provider)) {
            throw new Error('Expected 404 screen to include RouterContext.Provider');
        }
        expect(provider.type).toBe(RouterContext.Provider);
    });

    it('falls back to error when notFound is absent', () => {
        const router = new Router();
        const navigate = vi.fn();
        const error = vi.fn();
        router.events.on('navigate', navigate);
        router.events.on('error', error);

        router.push('/missing');

        expect(error).toHaveBeenCalledOnce();
        expect(navigate).not.toHaveBeenCalled();
        expect(router.currentPath).toBe('/');
        expect(router.historyLength).toBe(0);
    });

    it('back() navigates between consecutive notFound history entries', () => {
        const router = new Router({ notFound });
        const back = vi.fn();
        const error = vi.fn();
        router.events.on('back', back);
        router.events.on('error', error);

        router.push('/missing-a');
        router.push('/missing-b');

        router.back();

        expect(error).not.toHaveBeenCalled();
        expect(back).toHaveBeenCalledOnce();
        expect(router.currentPath).toBe('/missing-a');
        expect(router.historyLength).toBe(1);

        const event = back.mock.calls[0][0];
        expect(event.match.route.path).toBe('/missing-a');
        expect(event.direction).toBe('back');

        rendered = render(event.screen);
        expect(rendered.getByText('404 /missing-a')).not.toBeNull();
    });

    it('forward() restores a notFound entry from the forward stack', () => {
        const router = new Router({ notFound });
        const navigate = vi.fn();
        const error = vi.fn();
        router.events.on('navigate', navigate);
        router.events.on('error', error);
        router.addRoute('/home', () => 'Home');

        router.push('/home');
        router.push('/missing');
        router.back();

        navigate.mockClear();
        error.mockClear();

        router.forward();

        expect(error).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledOnce();
        expect(router.currentPath).toBe('/missing');
        expect(router.historyLength).toBe(2);

        const event = navigate.mock.calls[0][0];
        expect(event.match.route.path).toBe('/missing');
        expect(event.direction).toBe('forward');

        rendered = render(event.screen);
        expect(rendered.getByText('404 /missing')).not.toBeNull();
    });
});
