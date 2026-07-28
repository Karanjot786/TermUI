import { useState, useEffect ,useRef } from '@termuijs/jsx';
import { AdaptivePollingController, type AdaptivePollingOptions } from './adaptive-polling.js';

export interface UsePollingResult<T> {
    data: T | null;
    error: Error | null;
    loading: boolean;
    paused: boolean;
    pause: () => void;
    resume: () => void;
    refresh: () => void;
}

export interface UsePollingOptions {
    adaptive?: AdaptivePollingOptions;
}

/**
 * usePolling — repeatedly execute an async function on a configurable interval.
 * Supports pause, resume, and manual refresh without restarting the timer or resetting state.
 */
export function usePolling<T>(
    fn: () => Promise<T>,
    interval: number,
    deps: unknown[] = [],
    options: UsePollingOptions = {},
): UsePollingResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [paused, setPaused] = useState<boolean>(false);

    const pausedRef = useRef(false);
    const mountedRef = useRef(true);
    const fnRef = useRef(fn);
    fnRef.current = fn;

    const inFlightRef = useRef(false);
    const requestIdRef = useRef(0);
    const adaptiveRef = useRef<AdaptivePollingController | null>(null);

    const execute = async () => {
        const startedAt = Date.now();
        if (inFlightRef.current) {
            adaptiveRef.current?.begin();
            return;
        }
        if (adaptiveRef.current && !adaptiveRef.current.begin()) {
            return;
        }
        inFlightRef.current = true;
        const requestId = ++requestIdRef.current;
        let succeeded = false;
        try {
            const result = await fnRef.current();
            succeeded = true;
            if (mountedRef.current && requestId === requestIdRef.current) {
                setData(result);
                setError(null);
                setLoading(false);
            }
        } catch (err) {
            if (mountedRef.current && requestId === requestIdRef.current) {
                setError(err instanceof Error ? err : new Error(String(err)));
                setLoading(false);
            }
        } finally {
            if (adaptiveRef.current) {
                if (succeeded) {
                    adaptiveRef.current.success(Date.now() - startedAt);
                } else {
                    adaptiveRef.current.failure();
                }
            }
            if (requestId === requestIdRef.current) {
                inFlightRef.current = false;
            }
        }
    };

    const pause = () => {
        pausedRef.current = true;
        setPaused(true);
    };

    const resume = () => {
        pausedRef.current = false;
        setPaused(false);
    };

    const refresh = () => {
        execute();
    };


    useEffect(() => {
        mountedRef.current = true;
        setLoading(true);
        adaptiveRef.current = options.adaptive ? new AdaptivePollingController(options.adaptive) : null;
        execute();

        if (adaptiveRef.current) {
            let timeout: ReturnType<typeof setTimeout> | undefined;
            const tick = async () => {
                if (!pausedRef.current) {
                    await execute();
                }
                if (mountedRef.current && adaptiveRef.current) {
                    timeout = setTimeout(tick, adaptiveRef.current.nextDelay());
                }
            };
            timeout = setTimeout(tick, adaptiveRef.current.nextDelay());
            return () => {
                mountedRef.current = false;
                inFlightRef.current = false;
                requestIdRef.current++;
                if (timeout) clearTimeout(timeout);
            };
        }

        const timer = setInterval(() => {
            if (!pausedRef.current) {
                execute();
            }
        }, interval);

        return () => {
            mountedRef.current = false;
            inFlightRef.current = false;
            requestIdRef.current++;
            clearInterval(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interval, options.adaptive, ...deps]);

    return { data, error, loading, paused, pause, resume, refresh };
}
