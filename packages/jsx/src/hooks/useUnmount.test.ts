import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createFiber,
  setCurrentFiber,
  clearCurrentFiber,
  runEffects,
  destroyFiber,
} from '../hooks.js';
import { useUnmount } from './useUnmount';

describe('useUnmount', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('does not invoke callback during normal render', () => {
    const fn = vi.fn();
    useUnmount(fn);
    runEffects(fiber);
    expect(fn).not.toHaveBeenCalled();
  });

  it('invokes callback when fiber is destroyed', () => {
    const fn = vi.fn();
    useUnmount(fn);
    runEffects(fiber);
    destroyFiber(fiber);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('invokes the latest callback identity on destroy', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    useUnmount(fn1);
    runEffects(fiber);

    fiber.hookIndex = 0;
    runEffects(fiber); // re-render with same effect (no deps changed)

    // simulate a re-render where callback changes
    fiber.hookIndex = 0;
    useUnmount(fn2);
    runEffects(fiber);

    destroyFiber(fiber);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('does not call callback if destroyFiber is never called', () => {
    const fn = vi.fn();
    useUnmount(fn);
    runEffects(fiber);
    expect(fn).not.toHaveBeenCalled();
  });
});
