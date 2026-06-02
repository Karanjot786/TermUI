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
export { sequence, parallel } from './sequence.js';
export type { AnimationRunner, SequenceStep, AnimatableValue } from './sequence.js';
// Shared interval timer pool
export { subscribe as timerPoolSubscribe, unsubscribeAll as timerPoolUnsubscribeAll } from './timer-pool.js';
// Path animation
export { pathAnimation } from './path.js'

// Virtual clock (for testing)
export type { VirtualClock } from './virtual-clock.js'