// ─────────────────────────────────────────────────────
// Router Hooks — useParams, useNavigate
// ─────────────────────────────────────────────────────

import { createContext, useContext } from '@termuijs/jsx';
import type { Router } from './router.js';
import type { RouteParams, RouteMeta } from './route.js';

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
export function useNavigate(): (path: string, options?: { replace?: boolean }) => void {
    const router = useContext(RouterContext);
    
    return (path: string, options?: { replace?: boolean }) => {
        if (!router) {
            return;
        }
        if (options?.replace) {
            router.replace(path);
        } else {
            router.push(path);
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
