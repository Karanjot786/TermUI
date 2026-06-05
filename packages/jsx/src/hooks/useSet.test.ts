import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender } from '../hooks.js';
import { useSet } from './useSet';

describe('useSet', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setRequestRender(() => { });
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('defaults to an empty set', () => {
    const [set] = useSet();
    expect(set.size).toBe(0);
  });

  it('seeds from an iterable', () => {
    const [set] = useSet([1, 2, 3]);
    expect(set.size).toBe(3);
    expect(set.has(1)).toBe(true);
    expect(set.has(2)).toBe(true);
    expect(set.has(3)).toBe(true);
  });

  it('add inserts an item', () => {
    const [, actions] = useSet<number>();
    actions.add(42);

    fiber.hookIndex = 0;
    const [set] = useSet<number>();
    expect(set.has(42)).toBe(true);
  });

  it('remove deletes an item', () => {
    const [, actions] = useSet([1, 2, 3]);
    actions.remove(2);

    fiber.hookIndex = 0;
    const [set] = useSet([1, 2, 3]);
    expect(set.has(2)).toBe(false);
    expect(set.size).toBe(2);
  });

  it('toggle adds an absent item and removes a present one', () => {
    const [, actions] = useSet([1]);
    actions.toggle(2);

    fiber.hookIndex = 0;
    const [set1] = useSet([1]);
    expect(set1.has(2)).toBe(true);

    actions.toggle(1);
    fiber.hookIndex = 0;
    const [set2] = useSet([1]);
    expect(set2.has(1)).toBe(false);
  });

  it('clear empties the set', () => {
    const [, actions] = useSet([1, 2, 3]);
    actions.clear();

    fiber.hookIndex = 0;
    const [set] = useSet([1, 2, 3]);
    expect(set.size).toBe(0);
  });

  it('actions create a new Set and never mutate the previous one', () => {
    const [set, actions] = useSet([1]);
    const original = set;
    actions.add(2);

    expect(original.has(2)).toBe(false);
    expect(original.size).toBe(1);
  });
});
