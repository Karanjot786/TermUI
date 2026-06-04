import { useRef, useState } from '../hooks.js';

export interface UseMapActions<K, V> {
  set: (key: K, value: V) => void;
  remove: (key: K) => void;
  reset: () => void;
  get: (key: K) => V | undefined;
}

export function useMap<K, V>(
  initialEntries?: ReadonlyArray<readonly [K, V]>,
): [Map<K, V>, UseMapActions<K, V>] {
  const initialRef = useRef(initialEntries);
  const [map, setMap] = useState(new Map(initialEntries));

  return [map, {
    set: (key: K, value: V) => setMap((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    }),
    remove: (key: K) => setMap((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    }),
    reset: () => setMap(new Map(initialRef.current)),
    get: (key: K) => map.get(key),
  }];
}
