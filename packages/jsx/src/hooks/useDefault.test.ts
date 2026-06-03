import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender } from '../hooks.js';
import { useDefault } from './useDefault';

describe('useDefault', () => {
  let fiber = createFiber();

  beforeEach(() => {
    fiber = createFiber();
    setRequestRender(() => { });
    setCurrentFiber(fiber);
  });

  afterEach(() => {
    clearCurrentFiber();
  });

  it('returns initialValue on the first render', () => {
    const [value] = useDefault('fallback', 'hello');
    expect(value).toBe('hello');
  });

  it('returned value never equals null or undefined', () => {
    const [, setValue] = useDefault('fallback', 'hello');
    setValue(null);

    fiber.hookIndex = 0;
    const [value] = useDefault('fallback', 'hello');
    expect(value).toBe('fallback');
    expect(value).not.toBeNull();
  });

  it('setting to null resolves to defaultValue', () => {
    const [, setValue] = useDefault('fallback', 'hello');
    setValue(null);

    fiber.hookIndex = 0;
    const [value] = useDefault('fallback', 'hello');
    expect(value).toBe('fallback');
  });

  it('setting to undefined resolves to defaultValue', () => {
    const [, setValue] = useDefault(42, 10);
    setValue(undefined);

    fiber.hookIndex = 0;
    const [value] = useDefault(42, 10);
    expect(value).toBe(42);
  });

  it('setting a normal value stores that value', () => {
    const [, setValue] = useDefault('fallback', 'hello');
    setValue('world');

    fiber.hookIndex = 0;
    const [value] = useDefault('fallback', 'hello');
    expect(value).toBe('world');
  });

  it('the default applies on read, not by overwriting stored state', () => {
    const [, setValue] = useDefault('fallback', 'hello');
    setValue(null);

    fiber.hookIndex = 0;
    const [value1] = useDefault('fallback', 'hello');
    expect(value1).toBe('fallback');

    setValue('restored');
    fiber.hookIndex = 0;
    const [value2] = useDefault('fallback', 'hello');
    expect(value2).toBe('restored');
  });
});
