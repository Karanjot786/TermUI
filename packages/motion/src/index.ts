// ─────────────────────────────────────────────────────
// @termuijs/motion — Terminal Animations
// ─────────────────────────────────────────────────────
// Spring physics
export {
    stepSpring,
    animateSpring,
    SPRING_PRESETS,
    springPreset,
} from './spring.js';
export type {
    SpringConfig,
    SpringState,
    SpringPresetName,
} from './spring.js';
// Transitions & easings
export { transition, fadeIn, fadeOut, slideIn, typewriter, pulse, easings, cubicBezier } from './transitions.js';
export type { TransitionOptions, EasingFn } from './transitions.js';
// Sequencing
export { sequence, parallel, repeat } from './sequence.js';
export type { AnimationRunner, SequenceStep, AnimatableValue, RepeatOptions } from './sequence.js';
export { stagger } from './stagger.js';
// Shared interval timer pool
export { subscribe as timerPoolSubscribe, unsubscribeAll as timerPoolUnsubscribeAll } from './timer-pool.js';

// Virtual clock (for testing)
export type { VirtualClock } from './virtual-clock.js'

// Interpolation
export { mapRange, interpolate } from './interpolate.js';
export type { InterpolateOptions } from './interpolate.js';

// Layout transitions
export { animateRect } from './layout-transition.js';
export type { LayoutTransitionOptions } from './layout-transition.js';

// 2D Vector Helpers & Path Animations
export { add, subtract, scale, lerp, distance, length, normalize, dot, circlePath, bezierCurve, pathAnimation } from './vectors.js';
export type { Vec2, PathAnimationOptions } from './vectors.js';


