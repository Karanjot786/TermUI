import { useState } from '../hooks.js';

export interface UseListActions<T> {
  push: (item: T) => void;
  removeAt: (index: number) => void;
  insertAt: (index: number, item: T) => void;
  update: (index: number, item: T) => void;
  clear: () => void;
  set: (items: T[]) => void;
}

export function useList<T>(initialList?: T[]): [T[], UseListActions<T>] {
  const [list, setList] = useState<T[]>(initialList ?? []);

  return [list, {
    push: (item: T) => setList((prev) => [...prev, item]),
    removeAt: (index: number) => setList((prev) => prev.filter((_, i) => i !== index)),
    insertAt: (index: number, item: T) => setList((prev) => [...prev.slice(0, index), item, ...prev.slice(index)]),
    update: (index: number, item: T) => setList((prev) => prev.map((v, i) => i === index ? item : v)),
    clear: () => setList([]),
    set: (items: T[]) => setList(items),
  }];
}
