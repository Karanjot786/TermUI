// ─────────────────────────────────────────────────────
// Router — manages screen navigation and route state
// ─────────────────────────────────────────────────────

import { EventEmitter } from '@termuijs/core';
import { createElement, ErrorBoundary, unmountAll, type VNode } from '@termuijs/jsx';
import {
    type Route,
    type RouteMatch,
    type RouteParams,
    type RouteMeta,
    matchRoute,
    compilePattern,
} from './route.js';
import { RouterContext } from './hooks.js';

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
                props: {
                    color: 'red',
                    bold: true,
                },
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

export type NavigateEvent = {
    match: RouteMatch;
    screen: VNode;
};

export type RouterEvents = {
    navigate: NavigateEvent;
    back: NavigateEvent | null;
    error: Error;
};

export interface RouterOptions {
    /** Initial path */
    initialPath?: string;
    /** Maximum history entries */
    maxHistory?: number;
}

export class Router {
    private _routes: Route[] = [];
    private _history: string[] = [];
    private _forwardStack: string[] = [];
    private _currentMatch: RouteMatch | null = null;
    private _maxHistory: number;
    private _isCleared: boolean = false;
    readonly events = new EventEmitter<RouterEvents>();

    constructor(options: RouterOptions = {}) {
        this._maxHistory = options.maxHistory ?? 100;

        if (options.initialPath) {
            this._history.push(options.initialPath);
        }
    }

    /** Register a route with full guard extraction signatures */
    addRoute(
        path: string,
        component: () => any,
        beforeEnter?: any,
        children?: any[],
        meta?: Record<string, any>,
    ): void {
        const { pattern, paramNames } = compilePattern(path);

        const { beforeEnter: beforeEnterFromMeta, ...metaWithoutBeforeEnter } = meta || {};
        const finalBeforeEnter = beforeEnter || beforeEnterFromMeta;

        this._routes.push({
            path,
            pattern,
            paramNames,
            component,
            beforeEnter: finalBeforeEnter,
            children: children || [],
            meta: metaWithoutBeforeEnter || {},
        });
    }

    /** Register multiple routes */
    addRoutes(
        routes: Array<{
            path: string;
            component: () => any;
            beforeEnter?: any;
            children?: any[];
            meta?: Record<string, any>;
        }>,
    ): void {
        for (const route of routes) {
            this.addRoute(
                route.path,
                route.component,
                route.beforeEnter,
                route.children,
                route.meta,
            );
        }
    }

    private _wrapScreen(match: RouteMatch): VNode {
        return createElement(
            RouterContext.Provider,
            { value: this },
            createElement(
                ErrorBoundary,
                { fallback: defaultErrorScreen },
                createElement(match.route.component, match.params),
            ),
        );
    }

    /** Navigate to a path */
    push(path: string): void {
        const match = matchRoute(path, this._routes);

        if (!match) {
            this.events.emit(
                'error',
                new Error("No route found for path: " + path),
            );
            return;
        }

        this._forwardStack = [];
        this._isCleared = false;
        this._history.push(path);

        if (this._history.length > this._maxHistory) {
            this._history = this._history.slice(-this._maxHistory);
        }

        this._currentMatch = {
            ...match,
            meta: match.route?.meta || {},
        };

        unmountAll();

        const screen = this._wrapScreen(this._currentMatch);

        this.events.emit('navigate', {
            match: this._currentMatch,
            screen,
        });
    }

    /** Replace current path */
    replace(path: string): void {
        const match = matchRoute(path, this._routes);

        if (!match) {
            this.events.emit(
                'error',
                new Error("No route found for path: " + path),
            );
            return;
        }

        this._isCleared = false;
        if (this._history.length > 0) {
            this._history[this._history.length - 1] = path;
        } else {
            this._history.push(path);
        }

        this._currentMatch = {
            ...match,
            meta: match.route?.meta || {},
        };

        unmountAll();

        const screen = this._wrapScreen(this._currentMatch);

        this.events.emit('navigate', {
            match: this._currentMatch,
            screen,
        });
    }

    /** Go back in history */
    back(): void {
        if (this._history.length <= 1) {
            return;
        }

        this._isCleared = false;
        const poppedPath = this._history.pop();
        if (poppedPath) {
            this._forwardStack.push(poppedPath);
        }

        const prevPath = this._history[this._history.length - 1];
        const match = prevPath ? matchRoute(prevPath, this._routes) : null;

        if (match) {
            this._currentMatch = {
                ...match,
                meta: match.route?.meta || {},
            };
            unmountAll();
            const screen = this._wrapScreen(this._currentMatch);
            this.events.emit('back', { match: this._currentMatch, screen });
        } else {
            this._currentMatch = null;
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
        this._currentMatch = { ...match, meta: match.route?.meta || {} };
        unmountAll();
        const screen = this._wrapScreen(this._currentMatch);
        this.events.emit('navigate', { match: this._currentMatch, screen });
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

    /** Clears the router navigation history securely. */
    clearHistory(): void {
        this._history = [];
        this._forwardStack = [];
        this._currentMatch = null;
        this._isCleared = true;
    }

    /** Checks if a given path matches the currently active route pattern. */
    isActive(path: string): boolean {
        if (this.currentPath === path) {
            return true;
        }

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
        if (this._isCleared) {
            return 0;
        }
        return this._history.length;
    }

    /** Check if we can go back */
    get canGoBack(): boolean {
        if (this._isCleared) {
            return false;
        }
        return this._history.length > 1;
    }

    /** All registered routes */
    get routes(): Route[] {
        return [...this._routes];
    }
}