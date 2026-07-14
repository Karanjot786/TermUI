// ─────────────────────────────────────────────────────
// Router — manages screen navigation
// ─────────────────────────────────────────────────────

import { EventEmitter } from '@termuijs/core';
import { createElement, ErrorBoundary, unmountAll, type VNode, getCurrentApp } from '@termuijs/jsx';
import { type Route, type RouteMatch, type RouteParams, type RouteMeta, type QueryParams, type RedirectTarget, matchRoute, compilePattern } from './route.js';
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
    direction?: 'push' | 'replace' | 'back' | 'forward';
}

export interface RouterEvents {
    navigate: NavigateEvent;
    back: NavigateEvent | null;
    error: Error;
}

export interface RouterOptions {
    /** Initial path */
    initialPath?: string;
    /** Maximum history entries (default: 100) */
    maxHistory?: number;
    /** Component rendered when no route matches */
    notFound?: (path: string) => VNode;
}

export class Router {
    private _routes: Route[] = [];
    private _history: string[] = [];
    private _forwardStack: string[] = [];
    private _currentMatch: RouteMatch | null = null;
    private _maxHistory: number;
    private _notFound?: (path: string) => VNode;
    private _pendingInitialPath: string | null = null;
    public autoUnmount = true;
    readonly events = new EventEmitter<RouterEvents>();

    constructor(options: RouterOptions = {}) {
        this._maxHistory = options.maxHistory ?? 100;
        this._notFound = options.notFound;

        if (options.initialPath) {
            this._pendingInitialPath = options.initialPath;
        }
    }

    /** Register a route */
    addRoute(
        path: string,
        component: () => any,
        layout?: () => any,
        options?: {
            lazy?: () => Promise<any>;
            beforeEnter?: (to: string) => boolean | string;
            afterEnter?: (to: string) => void;
            redirect?: RedirectTarget;
        },
    ): void;

    addRoute(
        path: string,
        component: () => any,
        layout?: () => any,
        children?: Route[],
        meta?: RouteMeta,
        redirectOrOptions?: RedirectTarget | {
            lazy?: () => Promise<any>;
            beforeEnter?: (to: string) => boolean | string;
            afterEnter?: (to: string) => void;
            redirect?: RedirectTarget;
        },
    ): void;

    addRoute(
        path: string,
        component: () => any,
        layout?: () => any,
        childrenOrOptions?: Route[] | {
            lazy?: () => Promise<any>;
            beforeEnter?: (to: string) => boolean | string;
            afterEnter?: (to: string) => void;
            redirect?: RedirectTarget;
        },
        meta?: RouteMeta,
        options?: {
            lazy?: () => Promise<any>;
            beforeEnter?: (to: string) => boolean | string;
            afterEnter?: (to: string) => void;
            redirect?: RedirectTarget;
        } | RedirectTarget,
    ): void {
        let children: Route[] | undefined = undefined;
        let finalOptions: {
            lazy?: () => Promise<any>;
            beforeEnter?: (to: string) => boolean | string;
            afterEnter?: (to: string) => void;
            redirect?: RedirectTarget;
        } | undefined = undefined;

        if (Array.isArray(childrenOrOptions)) {
            children = childrenOrOptions;
        } else if (childrenOrOptions && typeof childrenOrOptions === 'object') {
            finalOptions = childrenOrOptions as any;
        }

        if (typeof options === 'string' || typeof options === 'function') {
            finalOptions = { ...finalOptions, redirect: options };
        } else if (options && typeof options === 'object') {
            finalOptions = options;
        }

        let finalMeta = meta ?? {};
        if (options === undefined && meta && typeof meta === 'object' && ('lazy' in meta || 'beforeEnter' in meta || 'afterEnter' in meta || 'redirect' in meta)) {
            finalOptions = meta as any;
            const strippedMeta = { ...meta };
            delete (strippedMeta as any).lazy;
            delete (strippedMeta as any).beforeEnter;
            delete (strippedMeta as any).afterEnter;
            delete (strippedMeta as any).redirect;
            finalMeta = strippedMeta;
        }

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
            redirect: finalOptions?.redirect,
        });
        this._applyInitialPathIfPending();
    }

    /** Register multiple routes */
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
            redirect?: RedirectTarget;
        }>,
    ): void {
        for (const r of routes) {
            this.addRoute(r.path, r.component, r.layout, r.children, r.meta, {
                lazy: r.lazy,
                beforeEnter: r.beforeEnter,
                afterEnter: r.afterEnter,
                redirect: r.redirect,
            });
        }
    }

    /** Wrap a route match into a VNode with layout chain and providers */
    wrapScreen(match: RouteMatch): VNode {
        let screen = createElement(match.route.component, match.params);

        for (let i = match.chain.length - 2; i >= 0; i--) {
            const parent = match.chain[i];
            const Wrapper = parent.layout ?? parent.component;
            screen = createElement(Wrapper, { ...match.params, outlet: screen });
        }

        const withProvider = createElement(RouterContext.Provider, { value: this }, screen);

        return createElement(ErrorBoundary, { fallback: defaultErrorScreen }, withProvider);
    }

    private _createNotFoundMatch(path: string): RouteMatch {
        const route: Route = {
            path,
            component: () => this._notFound?.(path),
            meta: {},
        };

        return {
            route,
            chain: [route],
            params: {},
            meta: {},
            query: {},
        };
    }

    private _resolveRedirect(path: string, depth = 0): string | null {
        if (depth > 10) {
            this.events.emit('error', new Error(`Max redirect depth exceeded for path: ${path}`));
            return null;
        }

        const match = matchRoute(path, this._routes);
        if (!match) return path;

        if (match.route.redirect) {
            const redirectTarget = match.route.redirect;
            const nextPath = typeof redirectTarget === 'function' ? redirectTarget(match.params) : redirectTarget;
            return this._resolveRedirect(nextPath, depth + 1);
        }

        return path;
    }

    /**
     * Core navigation execution with redirect resolution, guard evaluation,
     * history management, and hook dispatch. Used by push, replace, back, and forward.
     */
    private _executeNavigation(
        path: string,
        options: {
            modifyHistory?: 'push' | 'replace' | 'none';
            clearForwardStack?: boolean;
            direction?: 'push' | 'replace' | 'back' | 'forward';
        } = {},
    ): void {
        const resolvedPath = this._resolveRedirect(path);
        if (!resolvedPath) return;

        const match = matchRoute(resolvedPath, this._routes);

        if (!match) {
            if (this._notFound) {
                if (options.clearForwardStack) {
                    this._forwardStack = [];
                }

                const { modifyHistory = 'push', direction = 'push' } = options;

                if (modifyHistory === 'push') {
                    this._history.push(resolvedPath);

                    if (this._history.length > this._maxHistory) {
                        this._history = this._history.slice(-this._maxHistory);
                    }
                } else if (modifyHistory === 'replace') {
                    if (this._history.length > 0) {
                        this._history[this._history.length - 1] = resolvedPath;
                    } else {
                        this._history.push(resolvedPath);
                    }
                }

                const notFoundMatch = this._createNotFoundMatch(resolvedPath);
                this._currentMatch = notFoundMatch;
                const app = getCurrentApp();
                if (app) app.focus.clearFocus();
                if (this.autoUnmount) unmountAll();
                const screen = this.wrapScreen(notFoundMatch);
                const emitEvent = direction === 'back' ? 'back' : 'navigate';
                this.events.emit(emitEvent, { match: notFoundMatch, screen, direction });
                return;
            }

            this.events.emit('error', new Error(`No route found for path: ${resolvedPath}`));
            return;
        }

        if (options.clearForwardStack) {
            this._forwardStack = [];
        }

        const guardResult = match.route.beforeEnter?.(resolvedPath);

        if (guardResult === false) {
            return;
        }

        if (typeof guardResult === 'string') {
            this._executeNavigation(guardResult, { ...options, clearForwardStack: false });
            return;
        }

        const { modifyHistory = 'push', direction = 'push' } = options;

        if (modifyHistory === 'push') {
            this._history.push(resolvedPath);

            if (this._history.length > this._maxHistory) {
                this._history = this._history.slice(-this._maxHistory);
            }
        } else if (modifyHistory === 'replace') {
            if (this._history.length > 0) {
                this._history[this._history.length - 1] = resolvedPath;
            } else {
                this._history.push(resolvedPath);
            }
        }

        this._currentMatch = match;
        const app = getCurrentApp();
        if (app) app.focus.clearFocus();
        if (this.autoUnmount) unmountAll();
        const screen = this.wrapScreen(match);

        const emitEvent = direction === 'back' ? 'back' : 'navigate';
        this.events.emit(emitEvent, { match, screen, direction });

        match.route.afterEnter?.(resolvedPath);
    }

    private _applyInitialPathIfPending(): void {
        if (!this._pendingInitialPath || this._routes.length === 0) return;
        const path = this._pendingInitialPath;
        this._pendingInitialPath = null;
        this.push(path);
    }

    /** Navigate to a path */
    push(path: string, options?: { query?: QueryParams }): void {
        let targetPath = path;
        if (options?.query) {
            const qs = new URLSearchParams(options.query).toString();
            if (qs) targetPath += (targetPath.includes('?') ? '&' : '?') + qs;
        }
        this._executeNavigation(targetPath, { clearForwardStack: true, direction: 'push' });
    }

    /** Replace current path */
    replace(path: string, options?: { query?: QueryParams }): void {
        let targetPath = path;
        if (options?.query) {
            const qs = new URLSearchParams(options.query).toString();
            if (qs) targetPath += (targetPath.includes('?') ? '&' : '?') + qs;
        }
        this._executeNavigation(targetPath, { modifyHistory: 'replace', direction: 'replace' });
    }

    /** Go back in history with full lifecycle (beforeEnter, afterEnter, redirects) */
    back(): void {
        if (this._history.length <= 1) return;

        const prevPath = this._history[this._history.length - 2];
        const match = prevPath ? matchRoute(prevPath, this._routes) : null;

        if (!match) {
            if (this._notFound && prevPath) {
                const poppedPath = this._history.pop();
                if (poppedPath) {
                    this._forwardStack.push(poppedPath);
                }
                this._executeNavigation(prevPath, {
                    modifyHistory: 'none',
                    clearForwardStack: false,
                    direction: 'back',
                });
                return;
            }

            this.events.emit('back', null);
            return;
        }

        const guardResult = match.route.beforeEnter?.(prevPath);

        if (guardResult === false) {
            return;
        }

        if (typeof guardResult === 'string') {
            const poppedPath = this._history.pop();
            if (poppedPath) {
                this._forwardStack.push(poppedPath);
            }
            this._executeNavigation(guardResult, { clearForwardStack: false, direction: 'back' });
            return;
        }

        const poppedPath = this._history.pop();
        if (poppedPath) {
            this._forwardStack.push(poppedPath);
        }

        this._currentMatch = match;
        if (this.autoUnmount) unmountAll();
        const screen = this.wrapScreen(match);

        this.events.emit('back', { match, screen, direction: 'back' });

        match.route.afterEnter?.(prevPath);
    }

    /** Move forward one step with full lifecycle (beforeEnter, afterEnter, redirects) */
    forward(): void {
        if (this._forwardStack.length === 0) return;

        const nextPath = this._forwardStack[this._forwardStack.length - 1];

        const match = matchRoute(nextPath, this._routes);
        if (!match) {
            if (this._notFound) {
                this._forwardStack.pop();
                this._executeNavigation(nextPath, {
                    modifyHistory: 'push',
                    clearForwardStack: false,
                    direction: 'forward',
                });
                return;
            }

            this.events.emit('error', new Error(`No route found for forward path: ${nextPath}`));
            return;
        }

        const guardResult = match.route.beforeEnter?.(nextPath);

        if (guardResult === false) {
            return;
        }

        if (typeof guardResult === 'string') {
            this._forwardStack.pop();
            this._executeNavigation(guardResult, {
                modifyHistory: 'push',
                clearForwardStack: false,
                direction: 'forward',
            });
            return;
        }

        this._forwardStack.pop();
        this._history.push(nextPath);
        this._currentMatch = match;
        if (this.autoUnmount) unmountAll();
        const screen = this.wrapScreen(match);
        this.events.emit('navigate', { match, screen, direction: 'forward' });

        match.route.afterEnter?.(nextPath);
    }

    /** Move delta steps: negative is back, positive is forward */
    go(delta: number): void {
        if (delta === 0) return;

        if (delta < 0) {
            const steps = Math.abs(delta);
            if (steps >= this._history.length) return;
            for (let i = 0; i < steps; i++) {
                this.back();
            }
        } else {
            if (delta > this._forwardStack.length) return;
            for (let i = 0; i < delta; i++) {
                this.forward();
            }
        }
    }

    /**
     * Checks if a given path matches the currently active route pattern.
     */
    isActive(path: string): boolean {
        // Return fast if string paths match exactly
        if (this.currentPath === path) {
            return true;
        }

        // Parse target path to see if it targets the currently active dynamic pattern configuration
        const targetMatch = matchRoute(path, this._routes);
        if (!targetMatch || !this._currentMatch) {
            return false;
        }

        return targetMatch.route.path === this._currentMatch.route.path;
    }

    /** Whether a forward entry exists */
    get canGoForward(): boolean {
        return this._forwardStack.length > 0;
    }

    /** Current route match */
    get current(): RouteMatch | null {
        return this._currentMatch;
    }

    /** Current path */
    get currentPath(): string {
        return this._history[this._history.length - 1] ?? '/';
    }

    /** Current route params */
    get params(): RouteParams {
        return this._currentMatch?.params ?? {};
    }

    /** Current route query params */
    get query(): QueryParams {
        return this._currentMatch?.query ?? {};
    }

    /** History stack depth */
    get historyLength(): number {
        return this._history.length;
    }

    /** Check if we can go back */
    get canGoBack(): boolean {
        return this._history.length > 1;
    }

    /** All registered routes */
    get routes(): Route[] {
        return [...this._routes];
    }
}
