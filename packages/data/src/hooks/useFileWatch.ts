import { useState, useEffect } from '@termuijs/jsx';
import { watch } from 'node:fs';

export interface FileWatchData {
    eventType: 'rename' | 'change';
    filename: string | null;
}

export interface UseFileWatchResult {
    data: FileWatchData | null;
    error: Error | null;
    loading: boolean;
}

export interface UseFileWatchOptions {
    persistent?: boolean;
    recursive?: boolean;
}

/**
 * useFileWatch — reactive hook to watch a file or directory path for changes.
 *
 * Starts watching on mount and cleans up the watcher when unmounted.
 * Re-triggers whenever the path or options change.
 *
 * @param path - The path to the file or directory.
 * @param options - Watch options (persistent, recursive).
 */
export function useFileWatch(
    path: string,
    options?: UseFileWatchOptions,
): UseFileWatchResult {
    const [data, setData] = useState<FileWatchData | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;
        let watcher: ReturnType<typeof watch> | null = null;

        try {
            watcher = watch(path, {
                persistent: options?.persistent,
                recursive: options?.recursive,
            });

            watcher.on('change', (eventType, filename) => {
                if (!isMounted) return;
                setData({
                    eventType: eventType as 'rename' | 'change',
                    filename: filename? String(filename): null,
                });
                setError(null);
                setLoading(false);
            });

            watcher.on('error', (err) => {
                if (!isMounted) return;
                setError(err);
                setLoading(false);
            });
        } catch (err) {
            if (isMounted) {
                setError(err instanceof Error ? err : new Error(String(err)));
                setLoading(false);
            }
        }

        return () => {
            isMounted = false;
            if (watcher) {
                watcher.close();
            }
        };
    }, [path, options?.persistent, options?.recursive]);

    return { data, error, loading };
}
