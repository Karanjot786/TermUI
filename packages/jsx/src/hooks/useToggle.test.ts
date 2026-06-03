import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender } from '../hooks.js';
import { useToggle } from './useToggle';

describe('useToggle', () => {
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
    const [value] = useToggle();
    expect(value).toBe(false);
  });

  it('toggle() flips the value', () => {
    const [initial, controls] = useToggle(false);
    expect(initial).toBe(false);

    controls.toggle();

    fiber.hookIndex = 0;
    const [nextValue] = useToggle(false);
    expect(nextValue).toBe(true);
  });

  it('on() sets the value to true', () => {
    const [, controls] = useToggle(false);
    controls.on();

    fiber.hookIndex = 0;
    const [nextValue] = useToggle(false);
    expect(nextValue).toBe(true);
  });

  it('off() sets the value to false', () => {
    const [, controls] = useToggle(true);
    controls.off();

    fiber.hookIndex = 0;
    const [nextValue] = useToggle(true);
    expect(nextValue).toBe(false);
  });
});
