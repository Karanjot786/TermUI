import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createFiber,
  setCurrentFiber,
  clearCurrentFiber,
  runEffects,
  destroyFiber,
} from '../hooks.js';
import { useUnmount } from './useUnmount.js';

describe('useUnmount', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

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
  });

  it('should call the latest callback on unmount if callback identity changes', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    // Initial render
    useUnmount(callback1);
    runEffects(fiber);

    // Re-render with new callback reference
    fiber.hookIndex = 0;
    useUnmount(callback2);
    runEffects(fiber);

    // Destroy fiber
    destroyFiber(fiber);

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});
