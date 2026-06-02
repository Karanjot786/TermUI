import { useRef, useState } from '../hooks.js';

export interface UseCounterOptions {
    min?: number;
    max?: number;
    step?: number;
}

export interface UseCounterActions {
    increment: () => void;
    decrement: () => void;
    reset: () => void;
    set: (v: number) => void;
}

function clamp(value: number, min?: number, max?: number): number {
    if (typeof min === 'number' && value < min) return min;
    if (typeof max === 'number' && value > max) return max;
    return value;
}

export function useCounter(
    initialValue = 0,
    opts: UseCounterOptions = {},
): [number, UseCounterActions] {
    const initialRef = useRef(clamp(initialValue, opts.min, opts.max));
    const [count, setCount] = useState(initialRef.current);
    const step = opts.step ?? 1;

    const set = (value: number): void => {
        setCount(clamp(value, opts.min, opts.max));
    };

    const increment = (): void => {
        setCount((current) => clamp(current + step, opts.min, opts.max));
    };

    const decrement = (): void => {
        setCount((current) => clamp(current - step, opts.min, opts.max));
    };

    const reset = (): void => {
        setCount(initialRef.current);
    };

    return [count, { increment, decrement, reset, set }];
}
