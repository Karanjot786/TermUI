// ─────────────────────────────────────────────────────
// @termuijs/router — Screen Router
// ─────────────────────────────────────────────────────

// ─── Router Core ──────────────────────────────────────────────────────────────
export { Router, type RouterOptions, type NavigateEvent, type RouterEvents } from './router.js';
export { RouterView, type RouterViewProps } from './RouterView.js';
export { DefaultNotFound } from './DefaultNotFound.js';

// ─── Route Utilities ─────────────────────────────────────────────────────────
export {
    matchRoute,
    compilePattern,
    parseQuery,
    serializeQuery,
    type Route,
    type RouteMatch,
    type RouteParams,
    type QueryParams,
    type RouteMeta,
    type RedirectTarget,
    type LazyLoader,
    type BeforeEnterGuard,
    type AfterEnterGuard,
} from './route.js';

// ─── Hooks ────────────────────────────────────────────────────────────────────
export {
    RouterContext,
    useRouter,
    useParams,
    useQuery,
    useNavigate,
    useLocation,
    useRouteMeta,
    useQueryParams,
} from './hooks.js';