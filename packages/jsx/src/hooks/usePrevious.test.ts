import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createFiber,
  setCurrentFiber,
  clearCurrentFiber,
  runEffects,
} from '../hooks.js';
import { usePrevious } from './usePrevious';

describe('usePrevious', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('returns undefined on the first render', () => {
    const result = usePrevious('initial');
    expect(result).toBeUndefined();
    runEffects(fiber);
  });

  it('returns the previous value on subsequent renders', () => {
    usePrevious('initial');
    runEffects(fiber);

    fiber.hookIndex = 0;
    const result = usePrevious('updated');
    expect(result).toBe('initial');
    runEffects(fiber);
  });
});