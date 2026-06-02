// ─────────────────────────────────────────────────────
// @termuijs/router — Screen Router
// ─────────────────────────────────────────────────────

export { Router } from './router.js';
export type { RouterOptions, RouterEvents, NavigateEvent } from './router.js';

export { compilePattern, matchRoute } from './route.js';
export type { Route, RouteMatch, RouteParams } from './route.js';

export { scanRoutes } from './scanner.js';
export type { ScannedRoute } from './scanner.js';

export { RouterContext, useParams, useNavigate } from './hooks.js';
export type { NavigateFunctions } from './hooks.js';
