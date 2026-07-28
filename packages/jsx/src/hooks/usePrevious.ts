import { useEffect, useRef } from '../hooks.js';

/**
 * usePrevious — returns the value held during the previous render.
 *
 * Returns `undefined` on the first render.
 *
 * ```tsx
 * function Counter() {
 *     const [count, setCount] = useState(0);
 *     const prevCount = usePrevious(count);
 *
 *     return <Text>Now: {count}, Before: {prevCount ?? '—'}</Text>;
 * }
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T | undefined>(undefined);

    useEffect(() => {
        ref.current = value;
    });

    return ref.current;
}
