// ─────────────────────────────────────────────────────
// @termuijs/store — Public API
// ─────────────────────────────────────────────────────

export { createStore, batch, logger } from './store.js';
export type {
    Store,
    UseStore,
    Computed,
    SetState,
    GetState,
    StateCreator,
    Selector,
    Listener,
    Middleware,
    StoreOptions,
    PersistOptions,
} from './store.js';

export { slices } from './slices.js';
export type { SliceDef } from './slices.js';
