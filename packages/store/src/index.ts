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
    NextMiddleware,
    StoreOptions,
    PersistOptions,
} from './store.js';

export { slices } from './slices.js';
export type { SliceDef } from './slices.js';

export { undoRedo } from './middleware/history.js';
export type { UndoRedoOptions, UndoRedoMiddleware } from './middleware/history.js';

export { logger } from './middleware/logger.js';
export type { LoggerOptions } from './middleware/logger.js';

export { throttle } from './middleware/throttle.js';
export type { ThrottleOptions } from './middleware/throttle.js';

export { validator } from './middleware/validator.js';
export type { ValidatorOptions } from './middleware/validator.js';

export { signal, mutate } from './mutate.js';
export type { Signal } from './mutate.js';

export type { EqualityFn } from './shallow.js';
export { shallow } from './shallow.js';

export { setIn, updateIn, deleteIn } from './immutable.js';
