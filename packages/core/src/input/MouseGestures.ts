// ─────────────────────────────────────────────────────
// @termuijs/core — Mouse gestures synthesizer
// ─────────────────────────────────────────────────────

import type { MouseEvent, MouseButton } from '../events/types.js';

export interface MouseGesturesOptions {
    /** Max ms between two clicks to count as a double-click. Default 300. */
    doubleClickMs?: number;
}

export class MouseGestures {
    private doubleClickMs: number;
    private lastMouseDown: { x: number; y: number; button: MouseButton; time: number } | null = null;
    private activeDragButton: MouseButton | null = null;
    private wasDragging = false;

    constructor(opts?: MouseGesturesOptions) {
        this.doubleClickMs = opts?.doubleClickMs ?? 300;
    }

    /**
     * Feed a raw MouseEvent. Returns synthesized events to emit
     * (may be empty). Does not mutate the input event.
     */
    feed(event: MouseEvent): MouseEvent[] {
        const synthesized: MouseEvent[] = [];

        if (event.type === 'mousedown') {
            const now = Date.now();
            if (
                this.lastMouseDown &&
                this.lastMouseDown.x === event.x &&
                this.lastMouseDown.y === event.y &&
                this.lastMouseDown.button === event.button &&
                now - this.lastMouseDown.time <= this.doubleClickMs
            ) {
                synthesized.push({
                    x: event.x,
                    y: event.y,
                    button: event.button,
                    type: 'dblclick',
                });
                // Reset so a third consecutive fast click doesn't trigger another double click
                this.lastMouseDown = null;
            } else {
                this.lastMouseDown = {
                    x: event.x,
                    y: event.y,
                    button: event.button,
                    time: now,
                };
            }

            this.activeDragButton = event.button;
            this.wasDragging = false;
        } else if (event.type === 'mousemove') {
            if (this.activeDragButton !== null) {
                this.wasDragging = true;
                synthesized.push({
                    x: event.x,
                    y: event.y,
                    button: this.activeDragButton,
                    type: 'drag',
                });
            }
        } else if (event.type === 'mouseup') {
            if (this.activeDragButton !== null) {
                if (this.wasDragging) {
                    synthesized.push({
                        x: event.x,
                        y: event.y,
                        button: event.button,
                        type: 'dragend',
                    });
                }
                this.activeDragButton = null;
                this.wasDragging = false;
            }
        }

        return synthesized;
    }
}
