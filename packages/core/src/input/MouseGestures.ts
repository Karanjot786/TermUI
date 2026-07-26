// ─────────────────────────────────────────────────────
// @termuijs/core — Mouse gestures synthesizer
// ─────────────────────────────────────────────────────

import type { MouseEvent, MouseButton } from '../events/types.js';

type SynthesizedMouseEvent = MouseEvent | {
    type: 'mousedrag';
    x: number;
    y: number;
    deltaX: number;
    deltaY: number;
    button: MouseButton;
} | {
    type: 'dragend';
    x: number;
    y: number;
    button: MouseButton;
};

export interface MouseGesturesOptions {
    /** Max ms between two clicks to count as a double-click. Default 300. */
    doubleClickMs?: number;
}

export class MouseGestures {
    private doubleClickMs: number;
    private lastMouseDown: { x: number; y: number; button: MouseButton; time: number } | null = null;
    private activeDragButton: MouseButton | null = null;
    private wasDragging = false;
    private lastDragPosition: { x: number; y: number } | null = null;

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
            this.lastDragPosition = { x: event.x, y: event.y };
        } else if (event.type === 'mousemove') {
            if (this.activeDragButton !== null && this.lastDragPosition !== null) {
                this.wasDragging = true;

                const deltaX = event.x - this.lastDragPosition.x;
                const deltaY = event.y - this.lastDragPosition.y;

                synthesized.push({
                    x: event.x,
                    y: event.y,
                    deltaX,
                    deltaY,
                    button: this.activeDragButton,
                    type: 'mousedrag',
                });

                this.lastDragPosition = { x: event.x, y: event.y };
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
                this.lastDragPosition = null;
            }
        }

        return synthesized;
    }
}