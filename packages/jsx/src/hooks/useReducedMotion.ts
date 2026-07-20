import { useState, useEffect } from '../hooks.js';
import { motionConfig } from '@termuijs/motion';

/**
 * useReducedMotion — subscribes to the current reduced-motion preference.
 *
 * Reflects `@termuijs/motion`'s `motionConfig.reducedMotion`: `true` when
 * `NO_MOTION=1` or `CI=1` is set in the environment, or when
 * `motionConfig.setReducedMotion(true)` has been called at runtime. Use it
 * to skip decorative animation in a component and render the settled state
 * directly, the same way `animateSpring` already does internally.
 *
 * Re-renders the component whenever `motionConfig.setReducedMotion()`
 * changes the effective value.
 *
 * ```tsx
 * function Carousel() {
 *     const reducedMotion = useReducedMotion();
 *     return reducedMotion
 *         ? <StaticSlide />
 *         : <AnimatedSlide />;
 * }
 * ```
 */
export function useReducedMotion(): boolean {
    const [reducedMotion, setReducedMotion] = useState(() => motionConfig.reducedMotion);

    useEffect(() => {
        return motionConfig.subscribe(setReducedMotion);
    }, []);

    return reducedMotion;
}
