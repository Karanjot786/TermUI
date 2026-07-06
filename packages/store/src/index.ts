// ─────────────────────────────────────────────────────
// @termuijs/store — Public API
// ─────────────────────────────────────────────────────

export {
    createStore,
    batch,
} from './store.js';
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
export * from './slice.js';
export type { SliceDefinition } from './slice.js';

export { createHistoryStore } from './history.js';
export type { TemporalHistory, TemporalStoreActions } from './history.js';

export { createLogger, logger } from './logger.js';
export type { LoggerOptions } from './logger.js';

export { signal, mutate } from './mutate.js';
export type { Signal } from './mutate.js';

export type { EqualityFn } from './shallow.js';
export { shallow } from './shallow.js';

