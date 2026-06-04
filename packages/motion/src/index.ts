// ─────────────────────────────────────────────────────
// @termuijs/motion — Terminal Animations
// ─────────────────────────────────────────────────────

// Spring physics
export { stepSpring, animateSpring, SPRING_PRESETS } from './spring.js';
export type { SpringConfig, SpringState } from './spring.js';

// Transitions & easings
export { transition, fadeIn, fadeOut, slideIn, typewriter, pulse, easings, cubicBezier } from './transitions.js';
export type { TransitionOptions, EasingFn } from './transitions.js'; 

// Shared interval timer pool
export { subscribe as timerPoolSubscribe, unsubscribeAll as timerPoolUnsubscribeAll } from './timer-pool.js';
