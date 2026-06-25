// ─────────────────────────────────────────────────────
// @termuijs/widgets — Drag and Drop
// ─────────────────────────────────────────────────────

import { type Screen, type KeyEvent, type MouseEvent } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

// ── Drag State Manager ──
export const DragState = {
    activeDragId: null as string | null,
    isDragging: false,
};

export interface DraggableOptions {
    id: string;
    onDragStart?: () => void;
}

export interface DroppableOptions {
    id: string;
    onDrop?: (draggedId: string) => void;
}

export class DraggableWidget extends Widget {
    private _id: string;
    private _onDragStart?: () => void;

    constructor(opts: DraggableOptions) {
        super();
        this._id = opts.id;
        this._onDragStart = opts.onDragStart;
        this.focusable = true;
    }

    private startDrag() {
        if (DragState.isDragging && DragState.activeDragId === this._id) return;
        DragState.activeDragId = this._id;
        DragState.isDragging = true;
        this._onDragStart?.();
        this.markDirty();
    }

    private cancelDrag() {
        if (DragState.activeDragId === this._id) {
            DragState.activeDragId = null;
            DragState.isDragging = false;
            this.markDirty();
        }
    }

    handleMouse(event: MouseEvent): void {
        if (event.type === 'mousedown') {
            this.startDrag();
        }
    }

    handleKey(event: KeyEvent): void {
        if (event.key === 'space') {
            if (DragState.activeDragId === this._id) {
                this.cancelDrag();
            } else {
                this.startDrag();
            }
        } else if (event.key === 'escape') {
            this.cancelDrag();
        }
    }

    protected _renderSelf(screen: Screen): void {
        // Transparent container
    }
}

export class DroppableWidget extends Widget {
    private _id: string;
    private _onDrop?: (draggedId: string) => void;

    constructor(opts: DroppableOptions) {
        super();
        this._id = opts.id;
        this._onDrop = opts.onDrop;
        this.focusable = true;
    }

    private handleDrop() {
        if (DragState.isDragging && DragState.activeDragId !== null) {
            this._onDrop?.(DragState.activeDragId);
            DragState.activeDragId = null;
            DragState.isDragging = false;
            this.markDirty();
        }
    }

    handleMouse(event: MouseEvent): void {
        if (event.type === 'mouseup') {
            this.handleDrop();
        }
    }

    handleKey(event: KeyEvent): void {
        if (event.key === 'enter' || event.key === 'space') {
            this.handleDrop();
        }
    }

    protected _renderSelf(screen: Screen): void {
        // Transparent container
    }
}
