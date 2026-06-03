<<<<<<< HEAD
import { useEffect, useRef } from '../hooks';

export function useUnmount(callback: () => void): void {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    return () => {
      ref.current();
    };
=======
import { useEffect } from '../hooks.js';

/**
 * useUnmount — run a cleanup callback function exactly once when the component unmounts.
 *
 * @param fn Cleanup callback to run on unmount.
 */
export function useUnmount(fn: () => void): void {
  useEffect(() => {
    return fn;
>>>>>>> 0d8c8af (feat(jsx): add useUnmount and useUpdateEffect hooks)
  }, []);
}
