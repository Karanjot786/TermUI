# @termuijs/store

A lightweight, robust, and framework-agnostic global state management system.

## `createStore`

Creates a new independent store instance.

```typescript
import { createStore } from '@termuijs/store';

export const useStore = createStore((set) => ({
  count: 0,
  inc: () => set(state => ({ count: state.count + 1 }))
}));
```

## `combineSlices`

Combines isolated module slices into a unified global store.

```typescript
import { combineSlices, createSlice } from '@termuijs/store';

const counter = createSlice('counter', (set) => ({ count: 0 }));
const useAppStore = combineSlices(counter);
```
