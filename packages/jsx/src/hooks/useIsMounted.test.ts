import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createFiber,
  setCurrentFiber,
  clearCurrentFiber,
  runEffects,
  destroyFiber,
} from '../hooks.js';
import { useIsMounted } from './useIsMounted.js';

describe('useIsMounted', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('returns a function getter that reports false on initial render', () => {
    const getIsMounted = useIsMounted();
    
    expect(typeof getIsMounted).toBe('function');
    expect(getIsMounted()).toBe(false);
    
    // Flush effects to keep harness happy
    runEffects(fiber);
  });

  it('returns true after mount effects run', () => {
    const getIsMounted = useIsMounted();
    
    // Flush the mount effects to trigger the ref update
    runEffects(fiber);
    
    expect(getIsMounted()).toBe(true);
  });

  it('maintains a stable getter identity across re-renders', () => {
    const getIsMountedFirst = useIsMounted();
    runEffects(fiber);

    // Simulate a component re-render by resetting the hook index
    fiber.hookIndex = 0;
    const getIsMountedSecond = useIsMounted();
    runEffects(fiber);

    // Assert identity stability (useCallback works)
    expect(getIsMountedFirst).toBe(getIsMountedSecond);
    expect(getIsMountedSecond()).toBe(true);
  });

  it('returns false after the fiber is destroyed', () => {
    const getIsMounted = useIsMounted();
    runEffects(fiber);
    expect(getIsMounted()).toBe(true);

    // Trigger unmount sequence
    destroyFiber(fiber);

    expect(getIsMounted()).toBe(false);
  });
});
