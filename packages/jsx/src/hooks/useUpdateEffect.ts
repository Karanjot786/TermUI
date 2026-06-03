<<<<<<< HEAD
import { useEffect, useRef } from '../hooks';

export function useUpdateEffect(
  effect: () => void | (() => void),
  deps?: unknown[],
): void {
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
=======
import { useEffect, useRef } from '../hooks.js';

/**
 * useUpdateEffect — behaves exactly like useEffect, but skips execution on the initial render.
 *
 * @param effect Effect callback to run.
 * @param deps Optional dependency array.
 */
export function useUpdateEffect(
  effect: () => void | (() => void),
  deps?: any[]
): void {
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
>>>>>>> 0d8c8af (feat(jsx): add useUnmount and useUpdateEffect hooks)
      return;
    }
    return effect();
  }, deps);
}
