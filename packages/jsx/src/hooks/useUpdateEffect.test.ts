import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createFiber,
  setCurrentFiber,
  clearCurrentFiber,
  runEffects,
} from '../hooks.js';
import { useUpdateEffect } from './useUpdateEffect';

describe('useUpdateEffect', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('does not run on the first render', () => {
    const fn = vi.fn();
    useUpdateEffect(fn, []);
    runEffects(fiber);
    expect(fn).not.toHaveBeenCalled();
  });

  it('runs when a dependency changes after the first render', () => {
    const fn = vi.fn();
    useUpdateEffect(fn, ['a']);
    runEffects(fiber);

    fiber.hookIndex = 0;
    useUpdateEffect(fn, ['b']);
    runEffects(fiber);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not run when dependencies are unchanged', () => {
    const fn = vi.fn();
    useUpdateEffect(fn, ['a']);
    runEffects(fiber);

    fiber.hookIndex = 0;
    useUpdateEffect(fn, ['a']);
    runEffects(fiber);

    expect(fn).not.toHaveBeenCalled();
  });

  it('runs cleanup before the next effect', () => {
    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);

    useUpdateEffect(effect, ['a']);
    runEffects(fiber);

    fiber.hookIndex = 0;
    useUpdateEffect(effect, ['b']);
    runEffects(fiber);

    expect(effect).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    fiber.hookIndex = 0;
    useUpdateEffect(effect, ['c']);
    runEffects(fiber);

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);
  });
});
