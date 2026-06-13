// ─────────────────────────────────────────────────────
// Router Hooks — useParams, useNavigate
// ─────────────────────────────────────────────────────

import { createContext, useContext } from '@termuijs/jsx';
import type { Router } from './router.js';
import type { RouteParams, RouteMeta, QueryParams } from './route.js';

export const RouterContext = createContext<Router | null>(null);

/**
 * Returns the current route parameters.
 */
export function useParams(): RouteParams {
    const router = useContext(RouterContext);
    if (!router) {
        return {};
    }
    return router.params;
}

/**
 * Returns a function to trigger navigation.
 */
export function useNavigate(): (path: string, options?: { replace?: boolean; query?: QueryParams }) => void {
    const router = useContext(RouterContext);
    
    return (path: string, options?: { replace?: boolean; query?: QueryParams }) => {
        if (!router) {
            return;
        }
        if (options?.replace) {
            router.replace(path, { query: options?.query });
        } else {
            router.push(path, { query: options?.query });
        }
    };
}

/**
 * Returns the current route's metadata.
 */
export function useRouteMeta(): RouteMeta {
    const router = useContext(RouterContext);
    return router?.current?.meta ?? {};
}

/**
 * Returns the current query parameters.
 */
export function useQueryParams(): QueryParams {
    const router = useContext(RouterContext);
    if (!router) {
        return {};
    }
    return router.query;
}
