// ─────────────────────────────────────────────────────
// Route — defines a screen route entry
// ─────────────────────────────────────────────────────

export type LazyLoader = () => Promise<any>;

export interface NavigationGuardContext {
    id: number;
    signal: AbortSignal;
    isStale: () => boolean;
}

export type BeforeEnterGuard = (to: string, context?: NavigationGuardContext) => boolean | string;

export type AfterEnterGuard = (to: string, context?: NavigationGuardContext) => void;

export type RouteMeta = Record<string, unknown>;

export interface RouteParams {
    [key: string]: string;
}

export interface QueryParams {
    [key: string]: string | string[];
}

export function parseQuery(queryString: string): QueryParams {
    const params = new URLSearchParams(queryString);
    const result: QueryParams = {};
    for (const [key, value] of params) {
        const existing = result[key];
        if (existing === undefined) {
            result[key] = value;
        } else if (Array.isArray(existing)) {
            existing.push(value);
        } else {
            result[key] = [existing, value];
        }
    }
    return result;
}

export function serializeQuery(query: QueryParams): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                params.append(key, item);
            }
        } else {
            params.append(key, value);
        }
    }
    return params.toString();
}

export type RedirectTarget =
    | string
    | ((params: RouteParams) => string);

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
    /** Declarative redirect target */
    redirect?: RedirectTarget;
}

export interface RouteMatch {
    route: Route;
    chain: Route[];
    params: RouteParams;
    meta: RouteMeta;
    query: QueryParams;
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
            const nextChain = [...chain, route];
            return {
                route,
                chain: nextChain,
                params,
                meta: Object.assign({}, ...nextChain.map(r => r.meta ?? {})),
                query: {},
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
    const questionIdx = path.indexOf('?');
    const pathname = questionIdx === -1 ? path : path.substring(0, questionIdx);
    const queryString = questionIdx === -1 ? '' : path.substring(questionIdx + 1);

    const match = matchNested(pathname, routes);
    if (match) {
        match.query = parseQuery(queryString);
        return match;
    }
    return null;
}
