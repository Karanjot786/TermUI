// Mutation

import { useCallback, useState } from "@termuijs/jsx";

export type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface UseMutationReturn<T> {
    mutate: (payload: unknown) => Promise<T>;
    reset: ()  => void;
    data: T | null;
    error: Error | null;
    loading: boolean;
    mutationCount: number;
}

/**
 * useMutation — reactive HTTP mutation hook with loading and error states.
 *
 * Returns a `mutate` function that sends a request to the provided `url`
 * with the specified HTTP `method` (default: POST). Updates are tracked via
 * `loading`, `data`, and `error` state.
 *
 * @param url - The endpoint URL to mutate.
 * @param method - HTTP method: 'POST' (default), 'PUT', 'PATCH', or 'DELETE'.
 */
export function useMutation<T = unknown>(url: string, method: HttpMethod = 'POST'): UseMutationReturn<T> {
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<Error | null>(null)
    const [data, setData] = useState<T | null>(null)
    const [mutationCount, setMutationCount] = useState<number>(0)

    const mutate = useCallback(async (payload: unknown): Promise<T> => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = (await response.json()) as T
            setData(result)
            setMutationCount((c)=> c+1)
            return result;

        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error('Mutation failed');
            setError(errorObj);
            throw errorObj;
        } finally {
            setLoading(false)
        }

    }, [url, method])

    const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
}, [])

    return { mutate,reset, data, error, loading,mutationCount };
}