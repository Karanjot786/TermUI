import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender } from '../hooks.js';
import { useMap } from './useMap';

describe('useMap', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setRequestRender(() => { });
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('useMap() defaults to an empty Map', () => {
    const [map] = useMap();
    expect(map.size).toBe(0);
  });

  it('useMap(entries) seeds the map from the entries', () => {
    const [map] = useMap([['a', 1], ['b', 2]]);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
    expect(map.size).toBe(2);
  });

  it('set(key, value) adds or overwrites an entry', () => {
    const [, actions] = useMap<string, number>([['a', 1]]);
    actions.set('b', 2);

    fiber.hookIndex = 0;
    const [nextMap] = useMap([['a', 1]]);
    expect(nextMap.get('b')).toBe(2);
    expect(nextMap.size).toBe(2);

    actions.set('a', 99);
    fiber.hookIndex = 0;
    const [updatedMap] = useMap([['a', 1]]);
    expect(updatedMap.get('a')).toBe(99);
  });

  it('remove(key) deletes an entry', () => {
    const [, actions] = useMap<string, number>([['a', 1], ['b', 2]]);
    actions.remove('a');

    fiber.hookIndex = 0;
    const [nextMap] = useMap([['a', 1], ['b', 2]]);
    expect(nextMap.has('a')).toBe(false);
    expect(nextMap.size).toBe(1);
  });

  it('reset() restores the initial entries', () => {
    const [, actions] = useMap<string, number>([['a', 1]]);
    actions.set('b', 2);
    actions.remove('a');

    fiber.hookIndex = 0;
    actions.reset();

    fiber.hookIndex = 0;
    const [resetMap] = useMap([['a', 1]]);
    expect(resetMap.size).toBe(1);
    expect(resetMap.get('a')).toBe(1);
  });

  it('get(key) returns the current value or undefined', () => {
    const [map, actions] = useMap<string, number>([['a', 1]]);
    expect(actions.get('a')).toBe(1);
    expect(actions.get('missing')).toBeUndefined();
    expect(map.get('a')).toBe(1);
  });

  it('actions create a new Map and never mutate the previous one', () => {
    const [original, actions] = useMap<string, number>([['a', 1]]);
    actions.set('b', 2);

    fiber.hookIndex = 0;
    const [nextMap] = useMap([['a', 1]]);
    expect(original.size).toBe(1);
    expect(nextMap.size).toBe(2);
    expect(original).not.toBe(nextMap);
  });
});
