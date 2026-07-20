// ─────────────────────────────────────────────────────
// Route — defines a screen route entry
// ─────────────────────────────────────────────────────

export type LazyLoader = () => Promise<any>;

export type BeforeEnterGuard = (to: string) => boolean | string;

export type AfterEnterGuard = (to: string) => void;

export type RouteMeta = Record<string, unknown>;

export interface RouteParams {
    [key: string]: string;
}

export interface Route {
    /** URL-like path, e.g. "/settings/theme" */
    path: string;
    /** Pattern for matching (compiled from path) */
    pattern?: RegExp;
    /** Parameter names from dynamic segments */
    paramNames?: string[];
    /** Screen component loader */
    component: () => any;
    /** Optional layout component */
    layout?: () => any;
    /** Nested child routes */
    children?: Route[];
    /** Lazy component loader */
    lazy?: LazyLoader;
    /** Navigation guard — return false to block, return a string to redirect */
    beforeEnter?: BeforeEnterGuard;
    /** Hook called after successful navigation */
    afterEnter?: AfterEnterGuard;
    /** Optional metadata object */
    meta?: RouteMeta;
}

export interface RouteMatch {
    route: Route;
    chain: Route[];
    params: RouteParams;
    meta: RouteMeta;
}

/**
 * Compile a file-based path pattern into a RegExp.
 *
 * Examples:
 *   "/"                → matches "/"
 *   "/settings"        → matches "/settings"
 *   "/tasks/[id]"      → matches "/tasks/123" with params.id = "123"
 *   "/[...slug]"       → matches "/a/b/c" with params.slug = "a/b/c"
 */
export function compilePattern(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    let regStr = '^';

    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
        return { pattern: /^\/?$/, paramNames: [] };
    }

    for (const seg of segments) {
        regStr += '\\/';

        if (seg.startsWith('[...') && seg.endsWith(']')) {
            const name = seg.slice(4, -1);
            paramNames.push(name);
            regStr += '(.+)';
        } else if (seg.startsWith('[') && seg.endsWith(']')) {
            const name = seg.slice(1, -1);
            paramNames.push(name);
            regStr += '([^/]+)';
        } else {
            regStr += seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
    }

    regStr += '\\/?$';

    return { pattern: new RegExp(regStr), paramNames };
}

function normalizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '');
}

function buildFullPath(parent: string, child: string): string {
    const p = normalizePath(parent);
    const c = normalizePath(child);
    if (!p) return '/' + c;
    if (!c) return '/' + p;
    return `/${p}/${c}`;
}

function matchNested(
    path: string,
    routes: Route[],
    parentPath = '',
    chain: Route[] = [],
): RouteMatch | null {
    for (const route of routes) {
        const fullPath = route.path.startsWith('/')
            ? route.path
            : buildFullPath(parentPath, route.path);

        const { pattern, paramNames } = compilePattern(fullPath);
        const match = pattern.exec(path);

        if (match) {
            const params: RouteParams = {};
            for (let i = 0; i < paramNames.length; i++) {
                params[paramNames[i]] = match[i + 1] ?? '';
            }
            return {
                route,
                chain: [...chain, route],
                params,
                meta: route.meta ?? {},
            };
        }

        if (route.children?.length) {
            const childMatch = matchNested(path, route.children, fullPath, [...chain, route]);
            if (childMatch) return childMatch;
        }
    }

    return null;
}

export function matchRoute(path: string, routes: Route[]): RouteMatch | null {
    return matchNested(path, routes);
}
