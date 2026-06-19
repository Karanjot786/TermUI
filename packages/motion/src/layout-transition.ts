// ─────────────────────────────────────────────────────
// @termuijs/motion — Layout Transitions
// ─────────────────────────────────────────────────────

import type { Rect } from '@termuijs/core';
import { animateSpring, type SpringPresetName, type SpringConfig } from './spring.js';

export interface LayoutTransitionOptions {
    config?: Partial<SpringConfig> | SpringPresetName;
    onFrame: (rect: Rect) => void;
    onComplete?: () => void;
}

/**
 * Animates between two rectangles using spring physics.
 * Returns a cancellation function.
 */
export function animateRect(
    from: Rect,
    to: Rect,
    options: LayoutTransitionOptions
): () => void {
    const currentRect = { ...from };
    let active = 4;
    
    const checkDone = () => {
        if (active <= 0) return;
        active--;
        if (active <= 0 && options.onComplete) {
            options.onComplete();
        }
    };
    
    let frameRequested = false;
    const batchFrame = () => {
        if (!frameRequested) {
            frameRequested = true;
            queueMicrotask(() => {
                frameRequested = false;
                options.onFrame({ ...currentRect });
            });
        }
    };
    
    const cfg = options.config ?? 'default';
    
    const unsubs = [
        animateSpring(from.x, to.x, cfg, (v) => {
            currentRect.x = Math.round(v);
            batchFrame();
        }, checkDone),
        animateSpring(from.y, to.y, cfg, (v) => {
            currentRect.y = Math.round(v);
            batchFrame();
        }, checkDone),
        animateSpring(from.width, to.width, cfg, (v) => {
            currentRect.width = Math.round(v);
            batchFrame();
        }, checkDone),
        animateSpring(from.height, to.height, cfg, (v) => {
            currentRect.height = Math.round(v);
            batchFrame();
        }, checkDone)
    ];
    
    return () => {
        for (let i = 0; i < unsubs.length; i++) {
            unsubs[i]();
        }
    };
}
