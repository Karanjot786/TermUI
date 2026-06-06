// ─────────────────────────────────────────────────────
// Router — manages screen navigation
// ─────────────────────────────────────────────────────

import { EventEmitter } from '@termuijs/core';
import {
    createElement,
    ErrorBoundary,
    unmountAll,
    type VNode,
} from '@termuijs/jsx';

import {
    type Route,
    type RouteMatch,
    type RouteParams,
    type RedirectTarget,
    type RouteMeta,
    matchRoute,
    compilePattern,
} from './route.js';

import { RouterContext } from './hooks.js';

// ─────────────────────────────────────────────────────
// Error UI
// ─────────────────────────────────────────────────────

function defaultErrorScreen(err: Error): VNode {
    return {
        type: 'box',
        props: {
            border: 'single',
            borderColor: 'red',
            padding: 1,
        },
        children: [
            {
                type: 'text',
                props: { color: 'red', bold: true },
                children: ['Router Error'],
            },
            {
                type: 'text',
                props: {},
                children: [err.message],
            },
        ],
    } as any;
}

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────

export class Router {
    private _routes: Route[] = [];
    private _history: string[] = [];
    private _forwardStack: string[] = [];
    private _currentMatch: RouteMatch | null = null;
    private _maxHistory: number;

    readonly events = new EventEmitter<RouterEvents>();

    constructor(options: RouterOptions = {}) {
        this._maxHistory = options.maxHistory ?? 100;

        if (options.initialPath) {
            this._history.push(options.initialPath);
        }
    }

    // ─────────────────────────────────────────────────────
    // Add Route (FIXED)
    // ─────────────────────────────────────────────────────

    addRoute(
        path: string,
        component: () => any,
        layout?: () => any,
        childrenOrOptions?:
            | Route[]
            | {
                lazy?: () => Promise<any>;
                beforeEnter?: (to: string) => boolean | string;
                afterEnter?: (to: string) => void;
            },
        meta?: RouteMeta,
        options?: {
            lazy?: () => Promise<any>;
            beforeEnter?: (to: string) => boolean | string;
            afterEnter?: (to: string) => void;
        },
    ): void {
        let children: Route[] | undefined;

        let finalOptions = options;

        if (Array.isArray(childrenOrOptions)) {
            children = childrenOrOptions;
        } else if (childrenOrOptions && typeof childrenOrOptions === 'object') {
            finalOptions = childrenOrOptions;
        }

        const finalMeta = meta ?? {};

        const { pattern, paramNames } = compilePattern(path);

        this._routes.push({
            path,
            pattern,
            paramNames,
            component,
            layout,
            children,
            meta: finalMeta,
            lazy: finalOptions?.lazy,
            beforeEnter: finalOptions?.beforeEnter,
            afterEnter: finalOptions?.afterEnter,
        });
    }

    // ─────────────────────────────────────────────────────
    // Multiple Routes
    // ─────────────────────────────────────────────────────

    addRoutes(
        routes: Array<{
            path: string;
            component: () => any;
            layout?: () => any;
            children?: Route[];
            meta?: RouteMeta;
            lazy?: () => Promise<any>;
            beforeEnter?: (to: string) => boolean | string;
            afterEnter?: (to: string) => void;
        }>,
    ): void {
        for (const r of routes) {
            this.addRoute(r.path, r.component, r.layout, r.children, r.meta, {
                lazy: r.lazy,
                beforeEnter: r.beforeEnter,
                afterEnter: r.afterEnter,
            });
        }
    }

    // ─────────────────────────────────────────────────────
    // Redirect Resolver
    // ─────────────────────────────────────────────────────

    private resolveRedirect(path: string): string {
        const visited = new Set<string>();
        let currentPath = path;

        for (let depth = 0; depth < 10; depth++) {
            if (visited.has(currentPath)) {
                this.events.emit(
                    'error',
                    new Error('Redirect cycle detected'),
                );
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

        this.events.emit(
            'error',
            new Error('Redirect depth exceeded'),
        );

        return currentPath;
    }

    // ─────────────────────────────────────────────────────
    // Screen Wrapper
    // ─────────────────────────────────────────────────────

    private _wrapScreen(match: RouteMatch): VNode {
        let screen = createElement(match.route.component, match.params);

        for (let i = match.chain.length - 2; i >= 0; i--) {
            const parent = match.chain[i];
            const Wrapper = parent.layout ?? parent.component;

            screen = createElement(Wrapper, {
                ...match.params,
                outlet: screen,
            });
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

    // ─────────────────────────────────────────────────────
    // NAVIGATION (FIXED)
    // ─────────────────────────────────────────────────────

    push(path: string): void {
        const finalPath = this.resolveRedirect(path);
        const match = matchRoute(finalPath, this._routes);

        if (!match) {
            this.events.emit(
                'error',
                new Error(`No route found for path: ${path}`),
            );
            return;
        }

        const guardResult = match.route.beforeEnter?.(finalPath);

        if (guardResult === false) return;

        if (typeof guardResult === 'string') {
            this.push(guardResult);
            return;
        }

        this._history.push(finalPath);
        this._forwardStack = [];

        if (this._history.length > this._maxHistory) {
            this._history = this._history.slice(-this._maxHistory);
        }

        this._currentMatch = match;

        unmountAll();

        const screen = this._wrapScreen(match);

        this.events.emit('navigate', { match, screen });

        match.route.afterEnter?.(finalPath);
    }

    replace(path: string): void {
        const finalPath = this.resolveRedirect(path);
        const match = matchRoute(finalPath, this._routes);

        if (!match) {
            this.events.emit(
                'error',
                new Error(`No route found for path: ${path}`),
            );
            return;
        }

        const guardResult = match.route.beforeEnter?.(finalPath);

        if (guardResult === false) return;

        if (typeof guardResult === 'string') {
            this.replace(guardResult);
            return;
        }

        if (this._history.length > 0) {
            this._history[this._history.length - 1] = finalPath;
        } else {
            this._history.push(finalPath);
        }

        this._currentMatch = match;

        unmountAll();

        const screen = this._wrapScreen(match);

        this.events.emit('navigate', { match, screen });

        match.route.afterEnter?.(finalPath);
    }

    // ─────────────────────────────────────────────────────
    // BACK / FORWARD
    // ─────────────────────────────────────────────────────

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
        const nextPath = this._forwardStack.pop();
        if (!nextPath) return;

        const match = matchRoute(nextPath, this._routes);
        if (!match) {
            this.events.emit(
                'error',
                new Error(`No route found for forward path: ${nextPath}`),
            );
            return;
        }

        this._history.push(nextPath);
        this._currentMatch = match;

        unmountAll();

        const screen = this._wrapScreen(match);

        this.events.emit('navigate', { match, screen });
    }

    go(delta: number): void {
        if (delta === 0) return;

        if (delta < 0) {
            const steps = Math.abs(delta);
            if (steps >= this._history.length) return;
            for (let i = 0; i < steps; i++) this.back();
        } else {
            if (delta > this._forwardStack.length) return;
            for (let i = 0; i < delta; i++) this.forward();
        }
    }

    // ─────────────────────────────────────────────────────
    // GETTERS
    // ─────────────────────────────────────────────────────

    get canGoForward(): boolean {
        return this._forwardStack.length > 0;
    }

    get canGoBack(): boolean {
        return this._history.length > 1;
    }

    get current(): RouteMatch | null {
        return this._currentMatch;
    }

    get currentPath(): string {
        return this._history[this._history.length - 1] ?? '/';
    }

    get params(): RouteParams {
        return this._currentMatch?.params ?? {};
    }

    get historyLength(): number {
        return this._history.length;
    }

    get routes(): Route[] {
        return [...this._routes];
    }
}
