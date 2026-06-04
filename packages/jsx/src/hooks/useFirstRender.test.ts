import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createFiber,
  setCurrentFiber,
  clearCurrentFiber,
} from '../hooks.js';
import { useFirstRender } from './useFirstRender';

describe('useFirstRender', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('returns true on the first render', () => {
    const result = useFirstRender();
    expect(result).toBe(true);
  });

  it('returns false on the second render', () => {
    useFirstRender();

    fiber.hookIndex = 0;

    const result = useFirstRender();
    expect(result).toBe(false);
  });

  it('returns false on all later renders', () => {
    useFirstRender();

    fiber.hookIndex = 0;
    useFirstRender();

    fiber.hookIndex = 0;
    const result = useFirstRender();

    expect(result).toBe(false);
  });
});