import { useState, useEffect, useRef } from '../hooks.js';
/**
 * useThrottle — throttle a changing value.
 *
 * Returns a value that limits updates to at most once per intervalMs.
 *
 * ```tsx
 * const throttledValue = useThrottle(value, 300);
 * ```
 */

export function useThrottle<T>(value: T, intervalMs: number): T {
    const [throttledValue, setThrottledValue] = useState<T>(value);
    const latestValueRef = useRef<T>(value);
    const lastEmittedValueRef = useRef<T>(value);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef(intervalMs);
    latestValueRef.current = value;
    const runTimeout = () => {
        timeoutRef.current = setTimeout(() => {
            if (latestValueRef.current !== lastEmittedValueRef.current) {
                lastEmittedValueRef.current = latestValueRef.current;
                setThrottledValue(latestValueRef.current);
                runTimeout();
            } else {
                timeoutRef.current = null;
            }
        }, intervalMs);
    };
    // Effect to handle value updates and start throttle timer
    useEffect(() => {
        const intervalChanged = intervalRef.current !== intervalMs;
        const hasPendingValue = latestValueRef.current !== lastEmittedValueRef.current;
        intervalRef.current = intervalMs;

        if (intervalChanged && timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;

            if (hasPendingValue) {
                runTimeout();
            }
            return;
        }

        if (!timeoutRef.current) {
            // Emits the initial value change immediately
            lastEmittedValueRef.current = value;
            setThrottledValue(value);
            runTimeout();
        }
    }, [value, intervalMs]);
    // Effect to clean up the timer on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);
    return throttledValue;
}
