// ─────────────────────────────────────────────────────
// Router Hooks — useParams, useNavigate
// ─────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from '@termuijs/jsx';
import type { Router, NavigateEvent } from './router.js';
import type { RouteParams } from './route.js';

/**
 * Context for providing a Router instance to the component tree.
 * Wrap your app with RouterContext.Provider to enable useParams and useNavigate.
 */
export const RouterContext = createContext<Router | null>(null);

/**
 * Read the current route parameters from the active Router.
 * Returns an empty object if no router is available or no params match.
 *
 * ```tsx
 * function UserScreen() {
 *     const { id } = useParams();
 *     return <Text>User: {id}</Text>;
 * }
 * ```
 */
export function useParams(): RouteParams {
    const router = useContext(RouterContext);
    const [params, setParams] = useState<RouteParams>({ ...router?.params ?? {} });

    useEffect(() => {
        if (!router) return;

        const handler = (_event: NavigateEvent | null) => {
            setParams({ ...router.params });
        };

        router.events.on('navigate', handler);
        router.events.on('back', handler);

        return () => {
            router.events.off('navigate', handler);
            router.events.off('back', handler);
        };
    }, [router]);

    return params;
}

export interface NavigateFunctions {
    /** Navigate to a path, adding to the history stack */
    push: (path: string) => void;
    /** Navigate to a path, replacing the current history entry */
    replace: (path: string) => void;
    /** Go back to the previous route */
    back: () => void;
    /** Whether back navigation is available */
    canGoBack: boolean;
}

/**
 * Returns navigation functions bound to the active Router.
 * Functions are no-ops when called outside a RouterContext.Provider.
 *
 * ```tsx
 * function NavBar() {
 *     const { push, canGoBack, back } = useNavigate();
 *     return (
 *         <Box>
 *             {canGoBack && <Button onPress={back}>Back</Button>}
 *             <Button onPress={() => push('/settings')}>Settings</Button>
 *         </Box>
 *     );
 * }
 * ```
 */
export function useNavigate(): NavigateFunctions {
    const router = useContext(RouterContext);

    return {
        push: (path: string) => router?.push(path),
        replace: (path: string) => router?.replace(path),
        back: () => router?.back(),
        get canGoBack() {
            return router?.canGoBack ?? false;
        },
    };
}
