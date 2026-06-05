import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createFiber,
  setCurrentFiber,
  clearCurrentFiber,
  runEffects,
} from '../hooks.js';
import { useMount } from './useMount';

describe('useMount', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('runs the callback after the first render', () => {
    let calls = 0;

    useMount(() => {
      calls++;
    });

    expect(calls).toBe(0);

    runEffects(fiber);

    expect(calls).toBe(1);
  });

  it('runs the callback only once across re-renders', () => {
    let calls = 0;

    useMount(() => {
      calls++;
    });

    runEffects(fiber);

    fiber.hookIndex = 0;

    useMount(() => {
      calls++;
    });

    runEffects(fiber);

    expect(calls).toBe(1);
  });

  it('does not rerun when callback identity changes', () => {
    let calls = 0;

    useMount(() => {
      calls++;
    });

    runEffects(fiber);

    fiber.hookIndex = 0;

    useMount(() => {
      calls += 10;
    });

    runEffects(fiber);

    expect(calls).toBe(1);
  });

  it('returns undefined', () => {
    const result = useMount(() => {});

    expect(result).toBeUndefined();
  });
});
