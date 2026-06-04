import { useState } from '../hooks.js';

export interface UseSetActions<T> {
  add: (item: T) => void;
  remove: (item: T) => void;
  toggle: (item: T) => void;
  has: (item: T) => boolean;
  clear: () => void;
}

export function useSet<T>(
  initialItems?: Iterable<T>,
): [Set<T>, UseSetActions<T>] {
  const [state, setState] = useState(
    initialItems ? new Set(initialItems) : new Set<T>(),
  );

  const actions: UseSetActions<T> = {
    add: (item: T) => {
      setState((prev) => {
        const next = new Set(prev);
        next.add(item);
        return next;
      });
    },
    remove: (item: T) => {
      setState((prev) => {
        const next = new Set(prev);
        next.delete(item);
        return next;
      });
    },
    toggle: (item: T) => {
      setState((prev) => {
        const next = new Set(prev);
        if (next.has(item)) {
          next.delete(item);
        } else {
          next.add(item);
        }
        return next;
      });
    },
    has: (item: T) => state.has(item),
    clear: () => {
      setState(new Set<T>());
    },
  };

  return [state, actions];
}
