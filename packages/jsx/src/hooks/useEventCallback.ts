import { useRef, useCallback } from '../hooks.js';

export function useEventCallback<
    Args extends unknown[],
    Return,
>(
    callback: (...args: Args) => Return,
): (...args: Args) => Return {
    const callbackRef = useRef(callback);

    callbackRef.current = callback;

    return useCallback(
        (...args: Args) => callbackRef.current(...args),
        [],
    );
}