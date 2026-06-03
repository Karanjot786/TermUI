import { useEffect, useRef } from '../hooks';

export function useUpdateEffect(
  effect: () => void | (() => void),
  deps?: unknown[],
): void {
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    return effect();
  }, deps);
}
