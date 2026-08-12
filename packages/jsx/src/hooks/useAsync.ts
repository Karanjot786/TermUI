// ─────────────────────────────────────────────────────
// @termuijs/jsx — useAsync hook
// ─────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from '../hooks.js';

export interface UseAsyncOptions<T> {
    /** Whether to execute immediately on mount. Default: true */
    immediate?: boolean;
    /** Initial data value */
    initialData?: T;
    /** Callback fired upon successful promise resolution */
    onSuccess?: (data: T) => void;
    /** Callback fired upon promise rejection */
    onError?: (error: Error) => void;
}

export interface UseAsyncResult<T, TArgs extends unknown[] = unknown[]> {
    /** Resolved data (null when loading, idle, or on error) */
    data: T | null;
    /** Backward-compatible alias for isLoading */
    loading: boolean;
    /** Error object if the async function threw */
    error: Error | null;
    /** True while the async function is executing */
    isLoading: boolean;
    /** True if the async function resolved successfully */
    isSuccess: boolean;
    /** True if the async function rejected */
    isError: boolean;
    /** True before initial execution when immediate is false */
    isIdle: boolean;
    /** Re-execute the async function (returns resolved data or null) */
    refetch: () => Promise<T | null>;
    /** Execute the async function with optional arguments */
    execute: (...args: TArgs) => Promise<T | null>;
    /** Reset hook state back to initial/idle */
    reset: () => void;
}

/** Backward-compatible type alias */
export type AsyncState<T, TArgs extends unknown[] = unknown[]> = UseAsyncResult<T, TArgs>;

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * useAsync — load async data with automatic loading/error states, retries, and unmount safety.
 *
 * Supports both traditional dependency array syntax and options object syntax.
 *
 * ```tsx
 * function UserList() {
 *     const { data, isLoading, error } = useAsync(fetchUsers, { immediate: true });
 *     if (isLoading) return <Text>Loading...</Text>;
 *     if (error) return <Text color="red">Error: {error.message}</Text>;
 *     return <Table rows={data} columns={['name', 'email']} />;
 * }
 * ```
 */
export function useAsync<T, TArgs extends unknown[] = unknown[]>(
    asyncFn: (...args: TArgs) => Promise<T>,
    optionsOrDeps?: UseAsyncOptions<T> | unknown[],
): UseAsyncResult<T, TArgs> {
    const isDeps = Array.isArray(optionsOrDeps);
    const deps = isDeps ? optionsOrDeps : undefined;
    const options: UseAsyncOptions<T> = isDeps ? {} : (optionsOrDeps ?? {});

    const immediate = options.immediate ?? true;
    const initialData = options.initialData ?? null;

    const [data, setData] = useState<T | null>(initialData);
    const [status, setStatus] = useState<AsyncStatus>(immediate ? 'loading' : 'idle');
    const [error, setError] = useState<Error | null>(null);

    const versionRef = useRef(0);
    const asyncFnRef = useRef(asyncFn);
    asyncFnRef.current = asyncFn;

    const optionsRef = useRef(options);
    optionsRef.current = options;

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const execute = useCallback(
        async (...args: TArgs): Promise<T | null> => {
            const version = ++versionRef.current;
            setData(null);
            setStatus('loading');
            setError(null);

            try {
                const result = await asyncFnRef.current(...args);
                if (mountedRef.current && versionRef.current === version) {
                    setData(result);
                    setStatus('success');
                    optionsRef.current.onSuccess?.(result);
                }
                return result;
            } catch (err) {
                const errorObj = err instanceof Error ? err : new Error(String(err));
                if (mountedRef.current && versionRef.current === version) {
                    setData(null);
                    setError(errorObj);
                    setStatus('error');
                    optionsRef.current.onError?.(errorObj);
                }
                return null;
            }
        },
        deps ?? [asyncFn],
    );

    const reset = useCallback(() => {
        versionRef.current++;
        setData(initialData);
        setStatus('idle');
        setError(null);
    }, [initialData]);

    const refetch = useCallback(() => execute(...([] as unknown as TArgs)), [execute]);

    useEffect(() => {
        if (immediate) {
            execute(...([] as unknown as TArgs));
        }
    }, deps ? [immediate, ...deps] : []);

    return {
        data,
        loading: status === 'loading',
        error,
        isLoading: status === 'loading',
        isSuccess: status === 'success',
        isError: status === 'error',
        isIdle: status === 'idle',
        refetch,
        execute,
        reset,
    };
}
