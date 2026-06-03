// ─────────────────────────────────────────────────────
// @termuijs/motion — Terminal Animations
// ─────────────────────────────────────────────────────

// Spring physics
export { stepSpring, animateSpring, SPRING_PRESETS } from './spring.js';
export type { SpringConfig, SpringState } from './spring.js';

// Transitions & easings
export { transition, fadeIn, fadeOut, slideIn, typewriter, pulse, easings } from './transitions.js';
export type { TransitionOptions, EasingFn } from './transitions.js';

// Shared interval timer pool
export { subscribe as timerPoolSubscribe, unsubscribeAll as timerPoolUnsubscribeAll } from './timer-pool.js';

// 2D Vector Physics & Helper Utilities
export { add, scale, lerp, distance } from './vec2.js';
export type { Vec2 } from './vec2.js';