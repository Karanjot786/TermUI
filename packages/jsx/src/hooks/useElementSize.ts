// ─────────────────────────────────────────────────────
// @termuijs/jsx — useElementSize
//
// Hook to track the size of a widget element.
// Returns a ref to attach to the widget and the current size.
//
// Usage:
//   function MyComponent() {
//       const [ref, { width, height }] = useElementSize();
//       return <Box ref={ref}>Size: {width}x{height}</Box>;
//   }
// ─────────────────────────────────────────────────────

import { useEffect, useRef, useState } from '../hooks.js';

// Minimal structural shape this hook needs. Avoids importing the Widget
// base from @termuijs/widgets, which would create a jsx -> widgets cycle.
interface SizedWidget {
    rect?: { width: number; height: number };
    on?(event: string, cb: () => void): void;
    off?(event: string, cb: () => void): void;
}
type Widget = SizedWidget;

export interface ElementSize {
    width: number;
    height: number;
}

/**
 * useElementSize — track the size of a widget element.
 *
 * ```tsx
 * function ResizableBox() {
 *     const [ref, { width, height }] = useElementSize();
 *     return <Box ref={ref}>Size: {width}x{height}</Box>;
 * }
 * ```
 */
export function useElementSize(): [{ current: Widget | null }, ElementSize] {
    const widgetRef = useRef<Widget | null>(null);
    const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

    useEffect(() => {
        const widget = widgetRef.current;

        if (!widget) {
            setSize({ width: 0, height: 0 });
            return;
        }

        // Get initial size from widget's rect
        const updateSize = () => {
            if (widget && widget.rect) {
                setSize({ width: widget.rect.width, height: widget.rect.height });
            }
        };

        updateSize();

        // Subscribe to resize events if the widget supports them
        const onResize = () => updateSize();
        widget.on?.('resize', onResize);

        return () => {
            widget.off?.('resize', onResize);
        };
    }, []);

    return [widgetRef, size];
}
