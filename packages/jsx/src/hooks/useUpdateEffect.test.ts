import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createFiber,
  setCurrentFiber,
  clearCurrentFiber,
  runEffects,
} from '../hooks.js';
<<<<<<< HEAD
import { useUpdateEffect } from './useUpdateEffect';
=======
import { useUpdateEffect } from './useUpdateEffect.js';
>>>>>>> 0d8c8af (feat(jsx): add useUnmount and useUpdateEffect hooks)

describe('useUpdateEffect', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

<<<<<<< HEAD
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

=======
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
>>>>>>> 0d8c8af (feat(jsx): add useUnmount and useUpdateEffect hooks)
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);
  });
});
