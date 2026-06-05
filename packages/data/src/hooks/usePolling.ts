import { useState, useEffect } from '@termuijs/jsx';

export interface UsePollingResult<T> {
    data: T | null;
    error: Error | null;
    loading: boolean;
}

/**
 * usePolling — repeatedly execute an async function on a configurable interval.
 */
export function usePolling<T>(
    fn: () => Promise<T>,
    interval: number,
    deps: unknown[] = []
): UsePollingResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;
        let timer: ReturnType<typeof setInterval>;

        const execute = async () => {
            try {
                const result = await fn();
                if (mounted) {
                    setData(result);
                    setError(null);
                    setLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setLoading(false);
                }
            }
        };

        setLoading(true);
        execute();

        timer = setInterval(execute, interval);

        return () => {
            mounted = false;
            clearInterval(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interval, ...deps]);

    return { data, error, loading };
}
