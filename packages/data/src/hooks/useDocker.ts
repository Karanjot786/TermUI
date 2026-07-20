import { useState, useEffect } from '@termuijs/jsx';
import { docker } from '../docker.js';
import type { DockerContainer } from '../docker.js';

export interface UseDockerResult {
    data: DockerContainer[];
    error: Error | null;
    loading: boolean;
}

/**
 * useDocker — reactive Docker container monitoring hook.
 *
 * Polls `docker.list()` on the given interval and exposes
 * the result reactively. Cleans up timers on unmount.
 *
 * @param intervalMs - Poll interval in milliseconds (default 5000).
 */
export function useDocker(intervalMs = 5000): UseDockerResult {
    const [data, setData] = useState<DockerContainer[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;
        let timer: ReturnType<typeof setInterval> | null = null;

        const update = () => {
            try {
                const result = docker.list();
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
    }, [intervalMs]);

    return { data, error, loading };
}
