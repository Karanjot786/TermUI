import { useEffect, useRef } from '../hooks.js';

/**
 * useUnmount — run a cleanup callback function exactly once when the component unmounts.
 *
 * @param callback Cleanup callback to run on unmount.
 */
export function useUnmount(callback: () => void): void {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => () => {
    ref.current();
  }, []);
}
