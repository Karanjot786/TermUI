import { useState, useEffect } from '@termuijs/jsx';

export interface UseSSEResult<T> {
    data: T | null;
    error: Error | null;
    loading: boolean;
}

/**
 * useSSE — reactive Server-Sent Events subscription hook.
 *
 * Subscribes to the provided `url` via EventSource and returns the latest
 * event `data`, any connection `error`, and a `loading` flag that stays true
 * until the first event is received.
 *
 * Cleans up the EventSource on unmount or when `url` changes.
 *
 * @param url - SSE endpoint URL.
 * @param parse - Optional parser for raw event data (defaults to the string payload).
 */
export function useSSE<T = string>(
    url: string,
    parse?: (raw: string) => T,
): UseSSEResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;

        if (typeof EventSource === 'undefined') {
            setError(new Error('EventSource is not supported in this environment'));
            setLoading(false);
            return;
        }

        const EventSourceCtor = EventSource as unknown as { new(url: string): EventSource };
        const source = new EventSourceCtor(url);

        source.addEventListener('message', function (ev) {
            if (!isMounted) return;
            try {
                const value = parse ? parse(ev.data) : (ev.data as T);
                setData(value);
                setError(null);
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
                setLoading(false);
            }
        });

        source.onerror = function () {
            if (!isMounted) return;
            setError(new Error('SSE connection error'));
            setLoading(false);
        };

        return () => {
            isMounted = false;
            source.close();
        };
    }, [url]);

    return { data, error, loading };
}
