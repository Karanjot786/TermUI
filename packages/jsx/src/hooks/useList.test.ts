import { describe, it, expect, afterEach } from 'vitest';
import { clearCurrentFiber, createFiber, setCurrentFiber } from '../hooks.js';
import { useList } from './useList.js';

function renderList<T>(fiber = createFiber(), initialList?: T[]) {
  fiber.hookIndex = 0;
  setCurrentFiber(fiber);
  const result = useList(initialList);
  clearCurrentFiber();
  return { fiber, result };
}

describe('useList', () => {
  afterEach(() => {
    clearCurrentFiber();
  });

  it('defaults to an empty array', () => {
    const { result } = renderList();
    const [list] = result;
    expect(list).toEqual([]);
  });

  it('push(item) appends an item to the end', () => {
    const { fiber, result } = renderList<number>(undefined, [1, 2]);
    const [, actions] = result;

    actions.push(3);

    const [nextList] = renderList(fiber, [1, 2]).result;
    expect(nextList).toEqual([1, 2, 3]);
  });

  it('removeAt(index) removes the item at that index', () => {
    const { fiber, result } = renderList<string>(undefined, ['a', 'b', 'c']);
    const [, actions] = result;

    actions.removeAt(1);

    const [nextList] = renderList(fiber, ['a', 'b', 'c']).result;
    expect(nextList).toEqual(['a', 'c']);
  });

  it('insertAt(index, item) inserts an item at that index', () => {
    const { fiber, result } = renderList<string>(undefined, ['a', 'c']);
    const [, actions] = result;

    actions.insertAt(1, 'b');

    const [nextList] = renderList(fiber, ['a', 'c']).result;
    expect(nextList).toEqual(['a', 'b', 'c']);
  });

  it('update(index, item) replaces the item at that index', () => {
    const { fiber, result } = renderList<number>(undefined, [1, 2, 3]);
    const [, actions] = result;

    actions.update(1, 99);

    const [nextList] = renderList(fiber, [1, 2, 3]).result;
    expect(nextList).toEqual([1, 99, 3]);
  });

  it('clear() empties the list and set(items) replaces it', () => {
    const { fiber, result } = renderList<number>(undefined, [1, 2, 3]);
    const [, actions] = result;

    actions.clear();

    const [cleared] = renderList(fiber, [1, 2, 3]).result;
    expect(cleared).toEqual([]);

    actions.set([4, 5]);

    const [replaced] = renderList(fiber, [1, 2, 3]).result;
    expect(replaced).toEqual([4, 5]);
  });

  it('actions never mutate the previous array in place', () => {
    const { fiber, result } = renderList<number>(undefined, [1, 2, 3]);
    const [, actions] = result;
    const [original] = result;

    actions.push(4);

    const [nextList] = renderList(fiber, [1, 2, 3]).result;
    expect(original).toEqual([1, 2, 3]);
    expect(nextList).toEqual([1, 2, 3, 4]);
    expect(original).not.toBe(nextList);
  });
});
