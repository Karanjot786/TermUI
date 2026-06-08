import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender } from '../hooks.js';
import { useFocusManager } from './useFocusManager.js';

describe('useFocusManager', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setRequestRender(() => { });
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('initializes focused state to null', () => {
    const { focused } = useFocusManager();
    expect(focused).toBeNull();
  });

  it('focus(id) updates the focused state', () => {
    const result = useFocusManager();
    expect(result.focused).toBeNull();

    // Trigger focus
    result.focus('input-field');

    // Re-render
    fiber.hookIndex = 0;
    const nextResult = useFocusManager();
    expect(nextResult.focused).toBe('input-field');
  });

  it('blur() resets focused state back to null', () => {
    const result = useFocusManager();
    
    // Focus an element
    result.focus('input-field');

    // Re-render and blur
    fiber.hookIndex = 0;
    const nextResult = useFocusManager();
    nextResult.blur();

    // Re-render to verify it reset to null
    fiber.hookIndex = 0;
    const finalResult = useFocusManager();
    expect(finalResult.focused).toBeNull();
  });
});
