// ─────────────────────────────────────────────────────
// @termuijs/widgets — Drag and Drop
// ─────────────────────────────────────────────────────

import { type Screen, type KeyEvent, type MouseEvent } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

// ── Scoped Drag State ──

interface DragStateScope {
    activeDragId: string | null;
    isDragging: boolean;
    onDragEnd: (() => void) | null;
}

const _dragStateScopes = new Map<string, DragStateScope>();

function _getDragState(group: string): DragStateScope {
    let scope = _dragStateScopes.get(group);
    if (!scope) {
        scope = { activeDragId: null, isDragging: false, onDragEnd: null };
        _dragStateScopes.set(group, scope);
    }
    return scope;
}

/**
 * Legacy global drag state for backward compatibility.
 * Reads/writes the 'default' group scope.
 */
export const DragState = {
    get activeDragId(): string | null {
        return _getDragState('default').activeDragId;
    },
    set activeDragId(value: string | null) {
        _getDragState('default').activeDragId = value;
    },
    get isDragging(): boolean {
        return _getDragState('default').isDragging;
    },
    set isDragging(value: boolean) {
        _getDragState('default').isDragging = value;
    },
    get onDragEnd(): (() => void) | null {
        return _getDragState('default').onDragEnd;
    },
    set onDragEnd(value: (() => void) | null) {
        _getDragState('default').onDragEnd = value;
    },
};

export interface DraggableOptions {
    id: string;
    group?: string;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

export interface DroppableOptions {
    id: string;
    group?: string;
    onDrop?: (draggedId: string) => void;
    onDragEnter?: (draggedId: string) => void;
    onDragLeave?: (draggedId: string) => void;
}

export class DraggableWidget extends Widget {
    private _id: string;
    private _group: string;
    private _onDragStart?: () => void;
    private _onDragEnd?: () => void;

    constructor(opts: DraggableOptions) {
        super();
        this._id = opts.id;
        this._group = opts.group ?? 'default';
        this._onDragStart = opts.onDragStart;
        this._onDragEnd = opts.onDragEnd;
        this.focusable = true;
    }

    private startDrag() {
        const state = _getDragState(this._group);
        if (state.isDragging && state.activeDragId === this._id) return;
        state.activeDragId = this._id;
        state.isDragging = true;
        state.onDragEnd = () => this._onDragEnd?.();
        this._onDragStart?.();
        this.markDirty();
    }

    private cancelDrag() {
        const state = _getDragState(this._group);
        if (state.activeDragId === this._id) {
            state.activeDragId = null;
            state.isDragging = false;
            state.onDragEnd = null;
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
        const state = _getDragState(this._group);
        if (event.key === 'space') {
            if (state.activeDragId === this._id) {
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
    private _group: string;
    private _onDrop?: (draggedId: string) => void;
    private _onDragEnter?: (draggedId: string) => void;
    private _onDragLeave?: (draggedId: string) => void;

    constructor(opts: DroppableOptions) {
        super();
        this._id = opts.id;
        this._group = opts.group ?? 'default';
        this._onDrop = opts.onDrop;
        this._onDragEnter = opts.onDragEnter;
        this._onDragLeave = opts.onDragLeave;
        this.focusable = true;
    }

    private handleDrop() {
        const state = _getDragState(this._group);
        if (state.isDragging && state.activeDragId !== null) {
            const draggedId = state.activeDragId;
            const onDragEnd = state.onDragEnd;
            this._onDrop?.(draggedId);
            onDragEnd?.();
            state.activeDragId = null;
            state.isDragging = false;
            state.onDragEnd = null;
            this.markDirty();
        }
    }

    handleMouse(event: MouseEvent): void {
        const state = _getDragState(this._group);
        if (event.type === 'mouseup') {
            this.handleDrop();
        } else if (event.type === 'mouseenter' && state.isDragging && state.activeDragId) {
            this._onDragEnter?.(state.activeDragId);
        } else if (event.type === 'mouseleave' && state.isDragging && state.activeDragId) {
            this._onDragLeave?.(state.activeDragId);
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
