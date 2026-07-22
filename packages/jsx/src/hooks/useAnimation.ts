import { useState, useEffect, useRef } from '../hooks.js';
import { animateSpring } from '@termuijs/motion';
import type { SpringPresetName, SpringConfig } from '@termuijs/motion';

export interface UseAnimationConfig {
    type?: 'spring';
    preset?: SpringPresetName;
    config?: Partial<SpringConfig>;
}

/**
 * Hook to animate a value smoothly using spring physics.
 * @param targetValue The value to animate towards.
 * @param options Configuration for the spring physics.
 * @returns The current interpolated value.
 */
export function useAnimation(
    targetValue: number,
    options: UseAnimationConfig = {}
): number {
    const [currentValue, setCurrentValue] = useState(targetValue);
    
    // Keep track of the current animated value so we don't restart from 0
    // if the target changes mid-animation
    const animatedValueRef = useRef(targetValue);

    // NOTE: we intentionally do NOT depend on `options.config` itself.
    // Callers naturally pass an inline object literal (e.g.
    // `useAnimation(x, { config: { tension: 200 } })`), which creates a new
    // object identity on every render. useEffect's dep comparison is
    // Object.is per-index, so an object in the deps array would make the
    // effect re-fire (and the spring restart) every single render even
    // though the actual numeric values never changed. Depending on the
    // stable primitive fields instead keeps the effect from re-running
    // unless a value the caller actually cares about has changed.
    const { tension, friction, mass, precision } = options.config ?? {};

    useEffect(() => {
        const from = animatedValueRef.current;
        const to = targetValue;

        if (from === to) return;

        const config = options.config || options.preset || 'default';

        const stop = animateSpring(
            from,
            to,
            config,
            (value) => {
                animatedValueRef.current = value;
                setCurrentValue(value);
            }
        );

        return () => stop();
    }, [targetValue, options.preset, tension, friction, mass, precision]);

    return currentValue;
}
