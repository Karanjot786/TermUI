import { useEffect, useRef } from '../index.js';

export function useEventListener<T = unknown>(
    target: { 
        on(event: string, cb: (arg: T) => void): void; 
        off(event: string, cb: (arg: T) => void): void; 
    } | null,
    event: string,
    callback: (arg: T) => void
): void {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!target) return;

        const listener = (arg: T) => {
            if (savedCallback.current) {
                savedCallback.current(arg);
            }
        };

        target.on(event, listener);

        return () => {
            target.off(event, listener);
        };
    }, [target, event]);
}