// ─────────────────────────────────────────────────────
// Router — manages screen navigation
// ─────────────────────────────────────────────────────

import { EventEmitter } from '@termuijs/core';
import { createElement, ErrorBoundary, unmountAll, type VNode } from '@termuijs/jsx';

import {
    type Route,
    type RouteMatch,
    type RouteParams,
    type RedirectTarget,
    matchRoute,
    compilePattern,
} from './route.js';

import { RouterContext } from './hooks.js';

function defaultErrorScreen(err: Error): VNode {
    return {
        type: 'box',
        props: { border: 'single', borderColor: 'red', padding: 1 },
        children: [
            { type: 'text', props: { color: 'red', bold: true }, children: ['Router Error'] },
            { type: 'text', props: {}, children: [err.message] },
        ],
    } as any;
}

export interface NavigateEvent {
    match: RouteMatch;
    screen: VNode;
}

export interface RouterEvents {
    navigate: NavigateEvent;
    back: NavigateEvent | null;
    error: Error;
}

export interface RouterOptions {
    initialPath?: string;
    maxHistory?: number;
}

export class Router {
    private _routes: Route[] = [];
    private _history: string[] = [];
    private _forwardStack: string[] = [];
    private _currentMatch: RouteMatch | null = null;
    private _maxHistory: number;
    private _pendingInitialPath: string | null = null;

    readonly events = new EventEmitter<RouterEvents>();

    constructor(options: RouterOptions = {}) {
        this._maxHistory = options.maxHistory ?? 100;

        if (options.initialPath) {
            this._pendingInitialPath = options.initialPath;
        }
    }

    // ─────────────────────────────
    // Routes
    // ─────────────────────────────

    addRoute(
        path: string,
        component: () => any,
        layout?: () => any,
        _children?: Route[],
        _meta?: Record<string, unknown>,
        redirect?: RedirectTarget,
    ): void {
        const { pattern, paramNames } = compilePattern(path);

        this._routes.push({
            path,
            pattern,
            paramNames,
            component,
            layout,
            redirect,
        });
    }

    addRoutes(
        routes: Array<{
            path: string;
            component: () => any;
            layout?: () => any;
            redirect?: RedirectTarget;
        }>,
    ): void {
        for (const r of routes) {
            this.addRoute(r.path, r.component, r.layout, undefined, undefined, r.redirect);
        }
    }

    // ─────────────────────────────
    // Redirects
    // ─────────────────────────────

    private resolveRedirect(path: string): string {
        const visited = new Set<string>();
        let currentPath = path;

        for (let i = 0; i < 10; i++) {
            if (visited.has(currentPath)) {
                this.events.emit('error', new Error('Redirect cycle detected'));
                return currentPath;
            }

            visited.add(currentPath);

            const match = matchRoute(currentPath, this._routes);

            if (!match || !match.route.redirect) {
                return currentPath;
            }

            currentPath =
                typeof match.route.redirect === 'function'
                    ? match.route.redirect(match.params)
                    : match.route.redirect;
        }

        this.events.emit('error', new Error('Redirect depth exceeded'));
        return currentPath;
    }

    // ─────────────────────────────
    // Navigation
    // ─────────────────────────────

    push(path: string): void {
        const finalPath = this.resolveRedirect(path);
        this._navigateTo(finalPath);
    }

    replace(path: string): void {
        const finalPath = this.resolveRedirect(path);

        const match = matchRoute(finalPath, this._routes);
        if (!match) {
            this.events.emit('error', new Error(`No route found for path: ${finalPath}`));
            return;
        }

        this._history[this._history.length - 1] = finalPath;

        this._currentMatch = match;
        unmountAll();

        const screen = this._wrapScreen(match);
        this.events.emit('navigate', { match, screen });

        match.route.afterEnter?.(finalPath);
    }

    private _navigateTo(path: string): void {
        const match = matchRoute(path, this._routes);

        if (!match) {
            this.events.emit('error', new Error(`No route found for path: ${path}`));
            return;
        }

        this._forwardStack = [];

        const guard = match.route.beforeEnter?.(path);

        if (guard === false) return;

        if (typeof guard === 'string') {
            this.push(guard);
            return;
        }

        this._history.push(path);

        if (this._history.length > this._maxHistory) {
            this._history = this._history.slice(-this._maxHistory);
        }

        this._currentMatch = match;

        unmountAll();

        const screen = this._wrapScreen(match);

        this.events.emit('navigate', { match, screen });

        match.route.afterEnter?.(path);
    }

    // ─────────────────────────────
    // Back / Forward
    // ─────────────────────────────

    back(): void {
        if (this._history.length <= 1) return;

        const popped = this._history.pop();
        if (popped) this._forwardStack.push(popped);

        const prev = this._history[this._history.length - 1];
        const match = prev ? matchRoute(prev, this._routes) : null;

        this._currentMatch = match;

        if (match) {
            unmountAll();
            const screen = this._wrapScreen(match);
            this.events.emit('back', { match, screen });
        } else {
            this.events.emit('back', null);
        }
    }

    forward(): void {
        const next = this._forwardStack.pop();
        if (!next) return;

        const match = matchRoute(next, this._routes);
        if (!match) {
            this.events.emit('error', new Error(`No route found for forward path: ${next}`));
            return;
        }

        this._history.push(next);
        this._currentMatch = match;

        unmountAll();

        const screen = this._wrapScreen(match);

        this.events.emit('navigate', { match, screen });
    }

    // ─────────────────────────────
    // Helpers
    // ─────────────────────────────

    private _wrapScreen(match: RouteMatch): VNode {
        let screen = createElement(match.route.component, match.params);

        for (let i = match.chain.length - 2; i >= 0; i--) {
            const parent = match.chain[i];
            const Wrapper = parent.layout ?? parent.component;
            screen = createElement(Wrapper, { ...match.params, outlet: screen });
        }

        const withProvider = createElement(
            RouterContext.Provider,
            { value: this },
            screen,
        );

        return createElement(
            ErrorBoundary,
            { fallback: defaultErrorScreen },
            withProvider,
        );
    }

    // ─────────────────────────────
    // State
    // ─────────────────────────────

    get currentPath(): string {
        return this._history[this._history.length - 1] ?? '/';
    }

    get params(): RouteParams {
        return this._currentMatch?.params ?? {};
    }

    get historyLength(): number {
        return this._history.length;
    }

    get canGoBack(): boolean {
        return this._history.length > 1;
    }

    get canGoForward(): boolean {
        return this._forwardStack.length > 0;
    }

    get current(): RouteMatch | null {
        return this._currentMatch;
    }

    get routes(): Route[] {
        return [...this._routes];
    }
}