// ─────────────────────────────────────────────────────
// Route — defines a screen route entry
// ─────────────────────────────────────────────────────

export interface RouteParams {
    [key: string]: string;
}
export type RedirectTarget =
    | string
    | ((params: RouteParams) => string);

export interface Route {
    /** URL-like path, e.g. "/settings/theme" */
    path: string;
    /** Pattern for matching (compiled from path) */
    pattern: RegExp;
    /** Parameter names from dynamic segments */
    paramNames: string[];
    /** Screen component loader */
    component: () => any;
    /** Optional layout component */
    layout?: () => any;
    redirect?: RedirectTarget;
}

export interface RouteMatch {
    route: Route;
    params: RouteParams;
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
            // Catch-all: [...slug]
            const name = seg.slice(4, -1);
            paramNames.push(name);
            regStr += '(.+)';
        } else if (seg.startsWith('[') && seg.endsWith(']')) {
            // Dynamic: [id]
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

/**
 * Match a path against a list of routes.
 */
export function matchRoute(path: string, routes: Route[]): RouteMatch | null {
    for (const route of routes) {
        const match = route.pattern.exec(path);
        if (match) {
            const params: RouteParams = {};
            for (let i = 0; i < route.paramNames.length; i++) {
                params[route.paramNames[i]] = match[i + 1] ?? '';
            }
            return { route, params };
        }
    }
    return null;
}
