import { useState, useEffect } from '@termuijs/jsx';
import { database } from '../database.js';
import type { DatabaseConfig, DatabaseHealth } from '../database.js';

export interface UseDatabaseHealthResult {
    data: DatabaseHealth | null;
    error: Error | null;
    loading: boolean;
}

/**
 * useDatabaseHealth — reactive database connection pool health hook.
 *
 * Pings the database via `database.ping(config)` on the given interval
 * and exposes the result reactively. Cleans up timers on unmount.
 *
 * @param config - Database connection configuration.
 * @param intervalMs - Poll interval in milliseconds (default 5000).
 */
export function useDatabaseHealth(config: DatabaseConfig, intervalMs = 5000): UseDatabaseHealthResult {
    const [data, setData] = useState<DatabaseHealth | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;
        let timer: ReturnType<typeof setInterval> | null = null;

        const update = async () => {
            try {
                const result = await database.ping(config);
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
    }, [intervalMs, config.host, config.port, config.type, config.database, config.username]);

    return { data, error, loading };
}
