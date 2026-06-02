// ─────────────────────────────────────────────────────
// Router — manages screen navigation
// ─────────────────────────────────────────────────────

import { EventEmitter } from '@termuijs/core';
import { createElement, ErrorBoundary, unmountAll, type VNode } from '@termuijs/jsx';
import { type Route, type RouteMatch, type RouteParams, matchRoute, compilePattern } from './route.js';
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
        children: Route[] = []
    ): void {
        const { pattern, paramNames } = compilePattern(path);

        this._routes.push({
            path,
            pattern,
            paramNames,
            component,
            layout,
            children,
        });
    }

    /** Register multiple routes */
    addRoutes(
        routes: Array<{
            path: string;
            component: () => any;
            layout?: () => any;
            children?: Route[];
        }>
    ): void {
        for (const r of routes) {
            this.addRoute(
                r.path,
                r.component,
                r.layout,
                r.children ?? []
            );
        }
    }

    private _wrapScreen(match: RouteMatch): VNode {
        let screen = createElement(
            match.route.component,
            match.params
        );

        for (let i = match.chain.length - 2; i >= 0; i--) {
            const parent = match.chain[i];

            const Wrapper = parent.layout ?? parent.component;

            screen = createElement(
                Wrapper,
                {
                    ...match.params,
                    outlet: screen,
                }
            );
        }

        const withProvider = createElement(
            RouterContext.Provider,
            { value: this },
            screen
        );

        return createElement(
            ErrorBoundary,
            { fallback: defaultErrorScreen },
            withProvider,
        );
    }

    /** Navigate to a path */
    push(path: string): void {
        const match = matchRoute(path, this._routes);
        if (!match) {
            this.events.emit('error', new Error(`No route found for path: ${path}`));
            return;
        }
        this._history.push(path);
        // Prevent unbounded history growth
        if (this._history.length > this._maxHistory) {
            this._history = this._history.slice(-this._maxHistory);
        }
        this._currentMatch = match;
        unmountAll();
        const screen = this._wrapScreen(match);
        this.events.emit('navigate', { match, screen });
    }

    /** Replace current path */
    replace(path: string): void {
        const match = matchRoute(path, this._routes);
        if (!match) {
            this.events.emit('error', new Error(`No route found for path: ${path}`));
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
    }

    /** Go back in history */
    back(): void {
        if (this._history.length <= 1) return;
        this._history.pop();
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

    /** Current route match */
    get current(): RouteMatch | null { return this._currentMatch; }

    /** Current path */
    get currentPath(): string { return this._history[this._history.length - 1] ?? '/'; }

    /** Current route params */
    get params(): RouteParams { return this._currentMatch?.params ?? {}; }

    /** History stack depth */
    get historyLength(): number { return this._history.length; }

    /** Check if we can go back */
    get canGoBack(): boolean { return this._history.length > 1; }

    /** All registered routes */
    get routes(): Route[] { return [...this._routes]; }
}
