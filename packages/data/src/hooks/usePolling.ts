import { useState, useEffect ,useRef } from '@termuijs/jsx';

export interface UsePollingResult<T> {
    data: T | null;
    error: Error | null;
    loading: boolean;
    paused: boolean;
    pause: () => void;
    resume: () => void;
    refresh: () => void;
}

/**
 * usePolling — repeatedly execute an async function on a configurable interval.
 * Supports pause, resume, and manual refresh without restarting the timer or resetting state.
 */
export function usePolling<T>(
    fn: () => Promise<T>,
    interval: number,
    deps: unknown[] = []
): UsePollingResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [paused, setPaused] = useState<boolean>(false);

    const pausedRef = useRef(false);
    const mountedRef = useRef(true);
    const fnRef = useRef(fn);
    fnRef.current = fn;

    const execute = async () => {
        try {
            const result = await fnRef.current();
            if (mountedRef.current) {
                setData(result);
                setError(null);
                setLoading(false);
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err instanceof Error ? err : new Error(String(err)));
                setLoading(false);
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
        execute();

        const timer = setInterval(() => {
            if (!pausedRef.current) {
                execute();
            }
        }, interval);

        return () => {
            mountedRef.current = false;
            clearInterval(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interval, ...deps]);

    return { data, error, loading, paused, pause, resume, refresh };
}
