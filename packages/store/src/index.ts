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
export type { EqualityFn } from './shallow.js';
export { shallow } from './shallow.js';

export { setIn, updateIn, deleteIn } from './immutable.js';

