import { useState } from '../hooks.js';

/**
 * Returns a deferred copy of a value. 
 * On initial render, the returned value is the same as the provided value.
 * On updates, the hook first returns the old value, then schedules a deferred 
 * update to return the new value in a subsequent render.
 */
export function useDeferredValue<T>(value: T): T {
  const [deferredValue, setDeferredValue] = useState<T>(value);
  const [prevValue, setPrevValue] = useState<T>(value);

  if (value !== prevValue) {
    setPrevValue(value);
    
    // Schedule a non-blocking update for the deferred value
    // This executes immediately after the current synchronous render finishes
    Promise.resolve().then(() => {
      setDeferredValue(value);
    });
  }

  return deferredValue;
}