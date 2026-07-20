# @termuijs/store

Global state management for TermUI apps. Create a store with a creator function, use it inside components with an optional selector, and read or write state from anywhere.

Components only re-render when the specific slice they selected changes. If ten components share a store and one field updates, only the components watching that field re-render.

## Install

```bash
npm install @termuijs/store
```

Requires `@termuijs/jsx`.

## Usage

```typescript
import { createStore } from '@termuijs/store'

const useCounter = createStore((set) => ({
    count: 0,
    increment: () => set((s) => ({ count: s.count + 1 })),
    decrement: () => set((s) => ({ count: s.count - 1 })),
    reset: () => set({ count: 0 }),
}))

function Counter() {
    const count = useCounter((s) => s.count)
    const increment = useCounter((s) => s.increment)

    useInput((key) => { if (key === '+') increment() })

    return <Text>Count: {count}</Text>
}
```

## Selectors

Pass a function to read a specific slice. The component won't re-render when other slices change.

```typescript
const count  = useCounter((s) => s.count)   // only count
const filter = useAppStore((s) => s.filter)  // only filter
const all    = useCounter()                   // everything
```

## batch()

Group multiple `setState` calls into one reconciler pass. Use this in event handlers or timer callbacks where you update several fields at once.

```typescript
import { batch } from '@termuijs/store'

batch(() => {
    useAppStore.setState({ loading: true })
    useAppStore.setState({ items: [] })
    useAppStore.setState({ error: null })
})
// One reconciler pass fires, not three.
```

Without `batch()`, each `setState` triggers a separate render. With `batch()`, all updates in the callback flush together in one microtask.

## Access outside components

The hook has `getState`, `setState`, `subscribe`, and `destroy` attached directly.

```typescript
// Read
const current = useCounter.getState()

// Write from a timer
setInterval(() => {
    useCounter.setState((s) => ({ count: s.count + 1 }))
}, 5000)

// Subscribe to changes
const unsub = useCounter.subscribe((state, prev) => {
    console.log('count went from', prev.count, 'to', state.count)
})
unsub()
```

## Async actions

Actions are plain functions. Use async/await normally.

```typescript
const useDataStore = createStore((set) => ({
    items: [],
    loading: false,
    fetch: async () => {
        set({ loading: true })
        const items = await fetchItems()
        set({ items, loading: false })
    },
}))
```

## API

| Method | Description |
|--------|-------------|
| `createStore(creator)` | Create a store. Returns a hook |
| `useStore()` | Subscribe to full state |
| `useStore(selector)` | Subscribe to a derived slice |
| `useStore.getState()` | Read state without subscribing |
| `useStore.setState(partial)` | Write state from outside components |
| `useStore.subscribe(listener)` | Listen to changes. Returns unsubscribe |
| `useStore.destroy()` | Remove all subscribers (useful in tests) |
| `batch(fn)` | Group setState calls into one reconciler pass |

## Documentation

Full docs at [www.termui.io/docs/store/overview](https://www.termui.io/docs/store/overview).

## Store Guide

### 1. Overview
The `@termuijs/store` package provides global, reactive state management designed specifically for terminal environments. In TermUI apps, rendering happens in a terminal grid via ANSI escape sequences rather than a browser DOM. This makes efficient re-renders critical. 

The store uses a selective subscription pattern (Zustand-like). When components consume state via the store hook, they can specify a selector function. The component will only trigger a terminal cell refresh when the selected slice of state changes, preventing unnecessary frame re-draws. Use the store for managing shared state (e.g., application configuration, active user sessions, CLI navigation menus, and cached API responses) across decoupled components.

---

### 2. Create
To create a state store, call `createStore` with a `StateCreator` function (which receives `set` and `get` functions) or an initial state object. The returned object is a hook that can be invoked inside components, and it also exposes helper methods on itself for access outside the component lifecycle.

- **`getState()`**: Retrieves the current state of the store without initiating a subscription. Helpful inside event handlers or timers.
- **`setState()`**: Updates the state. You can pass a partial state object to merge, or a function that receives the current state and returns a partial update.

```typescript
import { createStore, SetState, GetState, StateCreator, UseStore } from '@termuijs/store';

interface AppState {
    theme: string;
    loading: boolean;
    setTheme: (theme: string) => void;
    toggleLoading: () => void;
}

const creator: StateCreator<AppState> = (set, get) => ({
    theme: 'dark',
    loading: false,
    setTheme: (theme) => set({ theme }),
    toggleLoading: () => {
        const currentLoading = get().loading;
        set({ loading: !currentLoading });
    },
});

// Create the store hook
const useAppStore: UseStore<AppState> = createStore(creator);

// Accessing state outside of components
const state = useAppStore.getState();
console.log('Current theme:', state.theme);

// Mutating state outside of components
useAppStore.setState({ theme: 'light' });
useAppStore.setState((state) => ({ loading: !state.loading }));
```

---

### 3. Selectors
Selectors allow components to subscribe only to the specific slices of the state they care about. In addition, you can create computed properties or batch multiple state changes together to minimize UI redraw passes.

- **`Selector`**: A function that maps the full state to a slice of state.
- **`Computed`**: A memoized selector that caches the derived value and only notifies its subscribers when the computed value actually changes.
- **`batch()`**: Groups multiple `setState` calls so that only a single terminal reconciler pass executes, rather than one per update.

```typescript
import { createStore, batch, Selector, Computed, UseStore } from '@termuijs/store';

interface CounterState {
    count: number;
    step: number;
    increment: () => void;
}

const useCounterStore: UseStore<CounterState> = createStore((set) => ({
    count: 0,
    step: 1,
    increment: () => set((s) => ({ count: s.count + s.step })),
}));

// 1. Selector usage
const selectCount: Selector<CounterState, number> = (state) => state.count;
// Inside a component: const count = useCounterStore(selectCount);

// 2. Computed values (memoized derived state)
const doubleCountComputed: Computed<number> = useCounterStore.computed(
    (state) => state.count * 2
);
const currentDouble = doubleCountComputed.get();
const unsubscribeComputed = doubleCountComputed.subscribe((value) => {
    // Fired only when the derived value changes
});

// 3. Batching multiple updates
batch(() => {
    useCounterStore.setState({ count: 10 });
    useCounterStore.setState({ step: 2 });
}); // Triggers a single render pass
```

---

### 4. Slices
As store states grow complex, they can be broken down into modular, independent files or objects and composed together using the `slices` helper and the `SliceDef` type. Each slice creator function receives the full store's `set` and `get` functions, enabling cross-slice reads and actions.

```typescript
import { createStore, slices, SliceDef, UseStore } from '@termuijs/store';

interface UserSlice {
    username: string;
    setUsername: (name: string) => void;
}

interface SettingsSlice {
    theme: string;
    setTheme: (theme: string) => void;
}

type CombinedState = UserSlice & SettingsSlice;

// Define slices using SliceDef
const createUserSlice: SliceDef<UserSlice, CombinedState> = (set) => ({
    username: 'Guest',
    setUsername: (name) => set({ username: name }),
});

const createSettingsSlice: SliceDef<SettingsSlice, CombinedState> = (set) => ({
    theme: 'dark',
    setTheme: (theme) => set({ theme }),
});

// Compose the combined store
const useStore: UseStore<CombinedState> = createStore(
    slices<CombinedState>({
        user: createUserSlice,
        settings: createSettingsSlice,
    })
);
```

---

### 5. Persist
State can be automatically persisted to and rehydrated from disk via the `persist` options in the store configuration.

- **`PersistOptions`**: Configures the key name, target filepath, and debounce time for disk writes.
  - `key`: The config key name (stored under standard OS application directories, e.g., `%APPDATA%` on Windows).
  - `file`: Direct absolute or relative file path to save the state.
  - `debounceMs`: Time in milliseconds to debounce file writes during frequent updates (default is `100`).

```typescript
import { createStore, PersistOptions, StoreOptions, UseStore } from '@termuijs/store';

interface ConfigState {
    theme: string;
    saveLocation: string;
}

const persistOptions: PersistOptions = {
    key: 'app-config',       // Automatically maps to OS-specific config folder
    // file: 'custom-config.json', // Or specify a file path
    debounceMs: 200,         // Debounces disk writes (default is 100ms)
};

const storeOptions: StoreOptions<ConfigState> = {
    persist: persistOptions,
};

const useConfigStore: UseStore<ConfigState> = createStore(
    {
        theme: 'dark',
        saveLocation: '/usr/bin',
    },
    storeOptions
);
```

---

### 6. Middleware
Store updates can be processed, transformed, or logged by using middlewares. A middleware interceptor runs every time state is set.

- **`Middleware`**: Intercepts `prevState` and `update`, and can invoke `next(transformedUpdate)` to execute the state transition.
- **`logger`**: A built-in middleware exported from `@termuijs/store` that logs previous and next states to the console/terminal.

```typescript
import { createStore, Middleware, logger, StoreOptions, UseStore } from '@termuijs/store';

interface CounterState {
    count: number;
    increment: () => void;
}

// Custom middleware to cap updates
const maxLimitMiddleware: Middleware<CounterState> = (prevState, update, next) => {
    const nextUpdate = { ...update };
    if (nextUpdate.count !== undefined && nextUpdate.count > 100) {
        nextUpdate.count = 100;
    }
    next(nextUpdate);
};

const options: StoreOptions<CounterState> = {
    middleware: [
        maxLimitMiddleware,
        logger, // Logs transition: Previous State -> Next State
    ],
};

const useCounterStore: UseStore<CounterState> = createStore(
    (set) => ({
        count: 0,
        increment: () => set((s) => ({ count: s.count + 1 })),
    }),
    options
);
```

## License

MIT
