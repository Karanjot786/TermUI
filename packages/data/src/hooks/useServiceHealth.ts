import { useState, useEffect } from '@termuijs/jsx';
import { services } from '../services.js';
import type { ServiceInfo } from '../services.js';

export interface UseServiceHealthResult {
    data: ServiceInfo[];
    error: Error | null;
    loading: boolean;
}

/**
 * useServiceHealth — reactive service/supervisor health hook.
 *
 * Polls `services.list(names)` on the given interval and exposes
 * the result reactively. Cleans up timers on unmount.
 *
 * @param names - Array of service names to monitor.
 * @param intervalMs - Poll interval in milliseconds (default 5000).
 */
export function useServiceHealth(names: string[], intervalMs = 5000): UseServiceHealthResult {
    const [data, setData] = useState<ServiceInfo[]>(() => services.list(names));
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;
        let timer: ReturnType<typeof setInterval> | null = null;

        const update = async () => {
            try {
                const result = services.list(names);
                if (isMounted) {
                    setData(result);
                    setError(null);
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setLoading(false);
                }
            }
        };

        update();
        timer = setInterval(update, intervalMs);

        return () => {
            isMounted = false;
            if (timer !== null) {
                clearInterval(timer);
            }
        };
    }, [intervalMs, ...names]);

    return { data, error, loading };
}
