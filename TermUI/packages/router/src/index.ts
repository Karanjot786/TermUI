// ─────────────────────────────────────────────────────
// @termuijs/router — Screen Router
// ─────────────────────────────────────────────────────

export { Router } from './router.js';
export type { RouterOptions, RouterEvents, NavigateEvent } from './router.js';

export { compilePattern, matchRoute } from './route.js';
export type {
    Route,
    RouteMatch,
    RouteParams,
    LazyLoader,
    BeforeEnterGuard,
    AfterEnterGuard,
    RouteMeta,
} from './route.js';

export { scanRoutes } from './scanner.js';
export type { ScannedRoute } from './scanner.js';

// Animated Route Transitions Interface Exports
export { RouteTransitionManager } from './transitions.js';
export type { RouteTransitionEvents, TransitionManagerOptions } from './transitions.js';

// Validation Engine Support
export * from './validation.js';

// Upstream Hooks
export { useParams, useNavigate, useRouteMeta } from './hooks.js';
