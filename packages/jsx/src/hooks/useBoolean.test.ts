import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender } from '../hooks.js';
import { useBoolean } from './useBoolean';

describe('useBoolean', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setRequestRender(() => { });
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('defaults initial value to false', () => {
    const [value] = useBoolean();
    expect(value).toBe(false);
  });

  it('useBoolean(true) starts with true', () => {
    const [value] = useBoolean(true);
    expect(value).toBe(true);
  });

  it('setTrue() sets the value to true', () => {
    const [, controls] = useBoolean(false);
    controls.setTrue();

    fiber.hookIndex = 0;
    const [nextValue] = useBoolean(false);
    expect(nextValue).toBe(true);
  });

  it('setFalse() sets the value to false', () => {
    const [, controls] = useBoolean(true);
    controls.setFalse();

    fiber.hookIndex = 0;
    const [nextValue] = useBoolean(true);
    expect(nextValue).toBe(false);
  });

  it('toggle() flips the current value', () => {
    const [, controls] = useBoolean(false);
    controls.toggle();

    fiber.hookIndex = 0;
    const [nextValue] = useBoolean(false);
    expect(nextValue).toBe(true);

    controls.toggle();
    fiber.hookIndex = 0;
    const [finalValue] = useBoolean(false);
    expect(finalValue).toBe(false);
  });

  it('set(value) sets the value directly', () => {
    const [, controls] = useBoolean(false);
    controls.set(true);

    fiber.hookIndex = 0;
    const [nextValue] = useBoolean(false);
    expect(nextValue).toBe(true);
  });
});
