import { useEffect, useRef } from '../hooks.js';

/**
 * useUpdateEffect — behaves exactly like useEffect, but skips execution on the initial render.
 *
 * @param effect Effect callback to run.
 * @param deps Optional dependency array.
 */
export function useUpdateEffect(
  effect: () => void | (() => void),
  deps?: unknown[]
): void {
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    return effect();
  }, deps);
}
