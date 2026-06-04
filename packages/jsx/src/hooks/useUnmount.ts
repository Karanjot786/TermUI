import { useEffect, useRef } from '../hooks';

export function useUnmount(callback: () => void): void {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    return () => {
      ref.current();
    };
  }, []);
}
