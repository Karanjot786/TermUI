// Mutation

import { useCallback, useState } from "@termuijs/jsx";

export type HttpMethod = 'POST' | 'PUT' | 'DELETE'

export interface UseMutationReturn<T> {
    mutate: (payload: any) => Promise<T>;
    data: T | null;
    error: Error | null;
    loading: boolean;
}

/**
 * useMutation — reactive HTTP mutation hook with loading and error states.
 *
 * Returns a `mutate` function that sends a request to the provided `url`
 * with the specified HTTP `method` (default: POST). Updates are tracked via
 * `loading`, `data`, and `error` state.
 *
 * @param url - The endpoint URL to mutate.
 * @param method - HTTP method: 'POST' (default), 'PUT', or 'DELETE'.
 */
export function useMutation<T = any>(url: string, method: HttpMethod = 'POST'): UseMutationReturn<T> {
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<Error | null>(null)
    const [data, setData] = useState<T | null>(null)

    const mutate = useCallback(async (payload: any): Promise<T> => {
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
            return result;

        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error('Mutation failed');
            setError(errorObj);
            throw errorObj;
        } finally {
            setLoading(false)
        }

    }, [url, method])

    return { mutate, data, error, loading };
}