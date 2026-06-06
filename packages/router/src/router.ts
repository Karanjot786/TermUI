// ─────────────────────────────────────────────────────
// Router — manages screen navigation
// ─────────────────────────────────────────────────────

import { EventEmitter } from '@termuijs/core';
import { createElement, ErrorBoundary, unmountAll, type VNode } from '@termuijs/jsx';
import { type Route, type RouteMatch, type RouteParams, type RouteMeta, matchRoute, compilePattern } from './route.js';
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
    /** Initial path */
    initialPath?: string;
    /** Maximum history entries (default: 100) */
    maxHistory?: number;
}

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

    /** Register a route */
    addRoute(
        path: string,
        component: () => any,
        layout?: () => any,
        options?: {
            lazy?: () => Promise<any>;
            beforeEnter?: (to: string) => boolean | string;
            afterEnter?: (to: string) => void;
        },
    ): void;

    addRoute(
        path: string,
        component: () => any,
        layout?: () => any,
        children?: Route[],
        meta?: RouteMeta,
        options?: {
            lazy?: () => Promise<any>;
            beforeEnter?: (to: string) => boolean | string;
            afterEnter?: (to: string) => void;
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
        },
        meta?: RouteMeta,
        options?: {
            lazy?: () => Promise<any>;
            beforeEnter?: (to: string) => boolean | string;
            afterEnter?: (to: string) => void;
        },
    ): void {
        let children: Route[] | undefined = undefined;
        let finalOptions: {
            lazy?: () => Promise<any>;
            beforeEnter?: (to: string) => boolean | string;
            afterEnter?: (to: string) => void;
        } | undefined = options;

        if (Array.isArray(childrenOrOptions)) {
            children = childrenOrOptions;
        } else if (childrenOrOptions && typeof childrenOrOptions === 'object') {
            finalOptions = childrenOrOptions;
        }

        let finalMeta = meta ?? {};
        if (options === undefined && meta && typeof meta === 'object' && ('lazy' in meta || 'beforeEnter' in meta || 'afterEnter' in meta)) {
            finalOptions = meta as any;
            const strippedMeta = { ...meta };
            delete (strippedMeta as any).lazy;
            delete (strippedMeta as any).beforeEnter;
            delete (strippedMeta as any).afterEnter;
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
        });
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

    private _wrapScreen(match: RouteMatch): VNode {
        let screen = createElement(match.route.component, match.params);

        for (let i = match.chain.length - 2; i >= 0; i--) {
            const parent = match.chain[i];
            const Wrapper = parent.layout ?? parent.component;
            screen = createElement(Wrapper, { ...match.params, outlet: screen });
        }

        const withProvider = createElement(RouterContext.Provider, { value: this }, screen);

        return createElement(ErrorBoundary, { fallback: defaultErrorScreen }, withProvider);
    }

    /** Navigate to a path */
    push(path: string): void {
        const match = matchRoute(path, this._routes);

        if (!match) {
            this.events.emit('error', new Error(`No route found for path: ${path}`));
            return;
        }

        // A new push(path) clears the forward stack
        this._forwardStack = [];
        const guardResult = match.route.beforeEnter?.(path);

        if (guardResult === false) {
            return;
        }

        if (typeof guardResult === 'string') {
            this.push(guardResult);
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

    /** Replace current path */
    replace(path: string): void {
        const match = matchRoute(path, this._routes);

        if (!match) {
            this.events.emit('error', new Error(`No route found for path: ${path}`));
            return;
        }

        const guardResult = match.route.beforeEnter?.(path);

        if (guardResult === false) {
            return;
        }

        if (typeof guardResult === 'string') {
            this.replace(guardResult);
            return;
        }

        if (this._history.length > 0) {
            this._history[this._history.length - 1] = path;
        } else {
            this._history.push(path);
        }

        this._currentMatch = match;

        unmountAll();

        const screen = this._wrapScreen(match);

        this.events.emit('navigate', { match, screen });

        match.route.afterEnter?.(path);
    }

    /** Go back in history */
    back(): void {
        if (this._history.length <= 1) return;
        
        // back() pushes the popped path onto a forward stack
        const poppedPath = this._history.pop();
        if (poppedPath) {
            this._forwardStack.push(poppedPath);
        }

        const prevPath = this._history[this._history.length - 1];
        const match = prevPath ? matchRoute(prevPath, this._routes) : null;

        this._currentMatch = match;

        if (match) {
            unmountAll();

            const screen = this._wrapScreen(match);

            this.events.emit('back', { match, screen });
        } else {
            this.events.emit('back', null);
        }
    }

    /** Move forward one step if a forward entry exists */
    forward(): void {
        if (this._forwardStack.length === 0) return;

        const nextPath = this._forwardStack.pop();
        if (!nextPath) return;

        const match = matchRoute(nextPath, this._routes);
        if (!match) {
            this.events.emit('error', new Error(`No route found for forward path: ${nextPath}`));
            return;
        }

        this._history.push(nextPath);
        this._currentMatch = match;
        unmountAll();
        const screen = this._wrapScreen(match);
        // forward() re-navigates to the most recent forward entry and emits navigate
        this.events.emit('navigate', { match, screen });
    }

    /** Move delta steps: negative is back, positive is forward */
    go(delta: number): void {
        if (delta === 0) return;

        if (delta < 0) {
            const steps = Math.abs(delta);
            // go(n) past either boundary is a no-op (clamped, no error)
            if (steps >= this._history.length) return;
            for (let i = 0; i < steps; i++) {
                this.back();
            }
        } else {
            // go(n) past either boundary is a no-op (clamped, no error)
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