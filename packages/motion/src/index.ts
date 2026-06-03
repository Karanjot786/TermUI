// ─────────────────────────────────────────────────────
// @termuijs/motion — Terminal Animations
// ─────────────────────────────────────────────────────
// Spring physics
export { stepSpring, animateSpring, SPRING_PRESETS } from './spring.js';
export type { SpringConfig, SpringState } from './spring.js';
// Transitions & easings
export { transition, fadeIn, fadeOut, slideIn, typewriter, pulse, easings } from './transitions.js';
export type { TransitionOptions, EasingFn } from './transitions.js';
// Sequencing
export { sequence, parallel, repeat } from './sequence.js';
export type { AnimationRunner, SequenceStep, AnimatableValue, RepeatOptions } from './sequence.js';
export { stagger } from './stagger.js';
// Shared interval timer pool
export { subscribe as timerPoolSubscribe, unsubscribeAll as timerPoolUnsubscribeAll } from './timer-pool.js';

// 2D Vector Physics & Helper Utilities
export { add, scale, lerp, distance } from './vec2.js';
export type { Vec2 } from './vec2.js';
// Path animation
export { pathAnimation } from './path.js'

// Virtual clock (for testing)
export type { VirtualClock } from './virtual-clock.js'
