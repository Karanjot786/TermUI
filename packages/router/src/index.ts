// ─────────────────────────────────────────────────────
// @termuijs/router — Screen Router
// ─────────────────────────────────────────────────────

export { Router } from './router.js';
export type { RouterOptions, RouterEvents, NavigateEvent } from './router.js';

export { compilePattern, matchRoute, parseQuery, serializeQuery } from './route.js';
export type {
    Route,
    RouteMatch,
    RouteParams,
    QueryParams,
    LazyLoader,
    BeforeEnterGuard,
    AfterEnterGuard,
    RouteMeta,
    RedirectTarget,
} from './route.js';

// Upstream Hooks
export { useParams, useNavigate, useRouteMeta, useQueryParams } from './hooks.js';


export * from './RouterView.js';
