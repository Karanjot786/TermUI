// ─────────────────────────────────────────────────────
// @termuijs/router — Screen Router
// ─────────────────────────────────────────────────────

export { Router } from './router.js';
export type { RouterOptions, RouterEvents, NavigateEvent } from './router.js';

export { compilePattern, matchRoute } from './route.js';
export type { Route, RouteMatch, RouteParams } from './route.js';

export { scanRoutes } from './scanner.js';
export type { ScannedRoute } from './scanner.js';
export * from './validation.js';

export { useParams, useNavigate } from './hooks.js';
