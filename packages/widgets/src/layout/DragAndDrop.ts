// ─────────────────────────────────────────────────────
// @termuijs/widgets — Drag and Drop
// ─────────────────────────────────────────────────────

import { type Screen, type KeyEvent, type MouseEvent } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

// ── Drag State Manager ──
// onDragEnd is set by the draggable when its drag starts, so a droppable can
// fire the dragged widget's lifecycle hook on a successful drop. Only one drag
// is ever active, so this is a single slot, not a registry keyed by widget id
// (a registry would retain every draggable ever constructed).
export const DragState = {
    activeDragId: null as string | null,
    isDragging: false,
    onDragEnd: null as (() => void) | null,
};

export interface DraggableOptions {
    id: string;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

export interface DroppableOptions {
    id: string;
    onDrop?: (draggedId: string) => void;
    onDragEnter?: (draggedId: string) => void;
    onDragLeave?: (draggedId: string) => void;
}

export class DraggableWidget extends Widget {
    private _id: string;
    private _onDragStart?: () => void;
    private _onDragEnd?: () => void;

    constructor(opts: DraggableOptions) {
        super();
        this._id = opts.id;
        this._onDragStart = opts.onDragStart;
        this._onDragEnd = opts.onDragEnd;
        this.focusable = true;
    }

    private startDrag() {
        if (DragState.isDragging && DragState.activeDragId === this._id) return;
        DragState.activeDragId = this._id;
        DragState.isDragging = true;
        DragState.onDragEnd = () => this._onDragEnd?.();
        this._onDragStart?.();
        this.markDirty();
    }

    private cancelDrag() {
        if (DragState.activeDragId === this._id) {
            DragState.activeDragId = null;
            DragState.isDragging = false;
            DragState.onDragEnd = null;
            this._onDragEnd?.();
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
    private _onDragEnter?: (draggedId: string) => void;
    private _onDragLeave?: (draggedId: string) => void;

    constructor(opts: DroppableOptions) {
        super();
        this._id = opts.id;
        this._onDrop = opts.onDrop;
        this._onDragEnter = opts.onDragEnter;
        this._onDragLeave = opts.onDragLeave;
        this.focusable = true;
    }

    private handleDrop() {
        if (DragState.isDragging && DragState.activeDragId !== null) {
            const draggedId = DragState.activeDragId;
            const onDragEnd = DragState.onDragEnd;
            this._onDrop?.(draggedId);
            onDragEnd?.();
            DragState.activeDragId = null;
            DragState.isDragging = false;
            DragState.onDragEnd = null;
            this.markDirty();
        }
    }

    handleMouse(event: MouseEvent): void {
        if (event.type === 'mouseup') {
            this.handleDrop();
        } else if (event.type === 'mouseenter' && DragState.isDragging && DragState.activeDragId) {
            this._onDragEnter?.(DragState.activeDragId);
        } else if (event.type === 'mouseleave' && DragState.isDragging && DragState.activeDragId) {
            this._onDragLeave?.(DragState.activeDragId);
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
