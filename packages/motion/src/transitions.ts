// ─────────────────────────────────────────────────────
// Transitions — pre-built animation effects
// ─────────────────────────────────────────────────────

import { caps } from '@termuijs/core';
import { subscribe } from './timer-pool.js';

export type EasingFn = (t: number) => number;

// ── Easing functions ──

export const easings = {
    linear: (t: number) => t,
    easeIn: (t: number) => t * t,
    easeOut: (t: number) => 1 - (1 - t) * (1 - t),
    easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

// ── Transition types ──

export interface TransitionOptions {
    durationMs: number;
    easing?: EasingFn;
    onFrame: (progress: number) => void;
    onComplete?: () => void;
}

/**
 * Run a tween animation from 0→1 over durationMs.
 * Returns a cleanup function to cancel.
 */
export function transition(options: TransitionOptions): () => void {
    const { durationMs, easing = easings.easeInOut, onFrame, onComplete } = options;

    if (!caps.motion) {
        onFrame(easing(1));
        onComplete?.();
        return () => {};
    }

    const startTime = Date.now();

    const unsub = subscribe(16, () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / durationMs, 1);
        const easedT = easing(t);
        onFrame(easedT);
        if (t >= 1) {
            unsub();
            onComplete?.();
        }
    });

    return () => unsub();
}

// ── Pre-built transitions ──

/** Fade: progress = opacity (0→1) */
export function fadeIn(durationMs: number, onFrame: (opacity: number) => void, onComplete?: () => void): () => void {
    return transition({ durationMs, easing: easings.easeOut, onFrame, onComplete });
}

/** Fade out: progress = opacity (1→0) */
export function fadeOut(durationMs: number, onFrame: (opacity: number) => void, onComplete?: () => void): () => void {
    return transition({ durationMs, easing: easings.easeIn, onFrame: t => onFrame(1 - t), onComplete });
}

/** Slide: progress = position offset (from→0) */
export function slideIn(from: number, durationMs: number, onFrame: (offset: number) => void, onComplete?: () => void): () => void {
    return transition({ durationMs, easing: easings.easeOutCubic, onFrame: t => onFrame(from * (1 - t)), onComplete });
}

/** Typewriter: reveal text character by character */
export function typewriter(text: string, durationMs: number, onFrame: (visibleChars: number) => void, onComplete?: () => void): () => void {
    return transition({
        durationMs,
        easing: easings.linear,
        onFrame: t => onFrame(Math.floor(t * text.length)),
        onComplete,
    });
}

/** Pulse: oscillates between 0 and 1 */
export function pulse(periodMs: number, onFrame: (intensity: number) => void): () => void {
    if (!caps.motion) {
        onFrame(1);
        return () => {};
    }

    const start = Date.now();

    const unsub = subscribe(16, () => {
        const elapsed = Date.now() - start;
        const phase = (elapsed % periodMs) / periodMs;
        const intensity = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
        onFrame(intensity);
    });

    return unsub;
}
/**
 * Creates a custom cubic bezier easing function for animations.
 * * @param x1 The x-coordinate of the first control point.
 * @param y1 The y-coordinate of the first control point.
 * @param x2 The x-coordinate of the second control point.
 * @param y2 The y-coordinate of the second control point.
 * @returns An easing function that maps a progress value (0 to 1) to an eased value.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3.0 * x1;
  const bx = 3.0 * (x2 - x1) - cx;
  const ax = 1.0 - cx - bx;

  const cy = 3.0 * y1;
  const by = 3.0 * (y2 - y1) - cy;
  const ay = 1.0 - cy - by;

  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleCurveDerivativeX = (t: number) => (3.0 * ax * t + 2.0 * bx) * t + cx;

  return function (progress: number): number {
    if (progress === 0 || progress === 1) return progress;

    let t = progress;
    for (let i = 0; i < 8; i++) {
      const currentX = sampleCurveX(t) - progress;
      const dX = sampleCurveDerivativeX(t);
      if (Math.abs(currentX) < 1e-7) {
        return sampleCurveY(t);
      }
      if (Math.abs(dX) < 1e-6) {
        break;
      }
      t = Math.min(1, Math.max(0, t - currentX / dX));
    }

    let low = 0;
    let high = 1;
    t = progress;
    for (let i = 0; i < 12; i++) {
      const currentX = sampleCurveX(t);
      if (Math.abs(currentX - progress) < 1e-7) {
        break;
      }
      if (currentX < progress) {
        low = t;
      } else {
        high = t;
      }
      t = (low + high) / 2;
    }

    return sampleCurveY(t);
  };
}