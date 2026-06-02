import { useState, useEffect, useRef } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

export function useElementSize<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      setSize({ width: 0, height: 0 });
      return;
    }

    setSize({
      width: element.offsetWidth,
      height: element.offsetHeight,
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      if (entry.target instanceof HTMLElement) {
        setSize({
          width: entry.target.offsetWidth,
          height: entry.target.offsetHeight,
        });
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return [ref, size] as const;
}
