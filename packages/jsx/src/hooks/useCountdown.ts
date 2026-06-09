// ─────────────────────────────────────────────────────
// @termuijs/jsx — useCountdown hook
// ─────────────────────────────────────────────────────
import { useState, useEffect, useRef } from '../hooks.js';

export interface UseCountdownOptions {
    intervalMs?: number;
}

export interface UseCountdownControls {
    start: () => void;
    pause: () => void;
    reset: () => void;
}

/**
 * useCountdown — counts down from a start value with start, pause, and reset controls.
 *
 * Returns [count, controls] where count decrements each interval until it reaches zero.
 * The countdown does not tick until start() is called.
 *
 * ```tsx
 * const [count, { start, pause, reset }] = useCountdown(10);
 * ```
 */
export function useCountdown(
    startValue: number,
    opts?: UseCountdownOptions,
): [number, UseCountdownControls] {
    const intervalMs = opts?.intervalMs ?? 1000;
    const [count, setCount] = useState(startValue);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startValueRef = useRef(startValue);

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setCount((c) => {
                    if (c <= 0) {
                        clearInterval(intervalRef.current!);
                        intervalRef.current = null;
                        setIsRunning(false);
                        return 0;
                    }
                    return c - 1;
                });
            }, intervalMs);
        } else {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isRunning, intervalMs]);

    const start = (): void => {
        if (count > 0) {
            setIsRunning(true);
        }
    };

    const pause = (): void => {
        setIsRunning(false);
    };

    const reset = (): void => {
        setIsRunning(false);
        setCount(startValueRef.current);
    };

    return [count, { start, pause, reset }];
}