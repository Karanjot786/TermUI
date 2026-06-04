import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createFiber,
  setCurrentFiber,
  clearCurrentFiber,
  runEffects,
} from '../hooks.js';
import { useUpdateEffect } from './useUpdateEffect.js';

describe('useUpdateEffect', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('should not execute the effect on the first render/mount', () => {
    const effect = vi.fn();
    useUpdateEffect(effect, []);
    runEffects(fiber);

    expect(effect).not.toHaveBeenCalled();
  });

  it('should execute the effect on subsequent renders/updates when dependencies change', () => {
    const effect = vi.fn();
    let count = 0;

    // Render 1: mount
    useUpdateEffect(effect, [count]);
    runEffects(fiber);
    expect(effect).not.toHaveBeenCalled();

    // Render 2: update with same dependency -> shouldn't run
    fiber.hookIndex = 0;
    useUpdateEffect(effect, [count]);
    runEffects(fiber);
    expect(effect).not.toHaveBeenCalled();

    // Render 3: update with changed dependency -> should run
    count = 1;
    fiber.hookIndex = 0;
    useUpdateEffect(effect, [count]);
    runEffects(fiber);
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('should run cleanup function when dependency changes', () => {
    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);
    let count = 0;

    // Render 1: mount
    useUpdateEffect(effect, [count]);
    runEffects(fiber);
    expect(effect).not.toHaveBeenCalled();

    // Render 2: update with changed dependency -> effect runs
    count = 1;
    fiber.hookIndex = 0;
    useUpdateEffect(effect, [count]);
    runEffects(fiber);
    expect(effect).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    // Render 3: update with changed dependency again -> cleanup runs first, then effect
    count = 2;
    fiber.hookIndex = 0;
    useUpdateEffect(effect, [count]);
    runEffects(fiber);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it('should execute the effect on all updates if no dependency array is provided, but still skip the initial render', () => {
    const effect = vi.fn();

    // Render 1: mount
    useUpdateEffect(effect);
    runEffects(fiber);
    expect(effect).not.toHaveBeenCalled();

    // Render 2: update -> should run
    fiber.hookIndex = 0;
    useUpdateEffect(effect);
    runEffects(fiber);
    expect(effect).toHaveBeenCalledTimes(1);

    // Render 3: update -> should run again
    fiber.hookIndex = 0;
    useUpdateEffect(effect);
    runEffects(fiber);
    expect(effect).toHaveBeenCalledTimes(2);
  });
});
