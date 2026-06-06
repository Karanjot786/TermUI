// ─────────────────────────────────────────────────────
// @termuijs/jsx — useStopwatch hook
// ─────────────────────────────────────────────────────
import { useState, useEffect, useRef } from '../hooks.js';

export interface UseStopwatchOptions {
    intervalMs?: number;
}

export interface UseStopwatchControls {
    start: () => void;
    pause: () => void;
    reset: () => void;
    isRunning: boolean;
}

/**
 * useStopwatch — tracks elapsed time with start, pause, and reset controls.
 *
 * Returns [elapsed, controls] where elapsed is in milliseconds.
 * The stopwatch does not tick until start() is called.
 *
 * ```tsx
 * const [elapsed, { start, pause, reset, isRunning }] = useStopwatch();
 * ```
 */
export function useStopwatch(
    opts?: UseStopwatchOptions,
): [number, UseStopwatchControls] {
    const intervalMs = opts?.intervalMs ?? 1000;
    const [elapsed, setElapsed] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setElapsed((e) => e + intervalMs);
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
        setIsRunning(true);
    };

    const pause = (): void => {
        setIsRunning(false);
    };

    const reset = (): void => {
        setIsRunning(false);
        setElapsed(0);
    };

    return [elapsed, { start, pause, reset, isRunning }];
}
