import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createFiber,
  setCurrentFiber,
  clearCurrentFiber,
  runEffects,
  destroyFiber,
} from '../hooks.js';
<<<<<<< HEAD
import { useUnmount } from './useUnmount';
=======
import { useUnmount } from './useUnmount.js';
>>>>>>> 0d8c8af (feat(jsx): add useUnmount and useUpdateEffect hooks)

describe('useUnmount', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

<<<<<<< HEAD
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
=======
  it('should not call the callback on mount/first render', () => {
    const callback = vi.fn();
    useUnmount(callback);
    runEffects(fiber);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should not call the callback on subsequent renders', () => {
    const callback = vi.fn();
    useUnmount(callback);
    runEffects(fiber);

    // Re-render
    fiber.hookIndex = 0;
    useUnmount(callback);
    runEffects(fiber);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should call the callback exactly once when component unmounts (destroyFiber is called)', () => {
    const callback = vi.fn();
    useUnmount(callback);
    runEffects(fiber);

    expect(callback).not.toHaveBeenCalled();

    // Destroy fiber (unmount component)
    destroyFiber(fiber);

    expect(callback).toHaveBeenCalledTimes(1);
>>>>>>> 0d8c8af (feat(jsx): add useUnmount and useUpdateEffect hooks)
  });
});
