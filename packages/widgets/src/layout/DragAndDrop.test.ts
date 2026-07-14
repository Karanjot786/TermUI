// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for DraggableWidget and DroppableWidget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { KeyEvent, MouseEvent as TermMouseEvent } from '@termuijs/core';
import { DragState, DraggableWidget, DroppableWidget } from './DragAndDrop.js';

function keyEvent(key: string): KeyEvent {
    return {
        key,
        raw: Buffer.alloc(0),
        ctrl: false,
        alt: false,
        shift: false,
        stopPropagation: () => {},
        preventDefault: () => {},
    };
}

function mouseEvent(type: TermMouseEvent['type']): TermMouseEvent {
    return { x: 0, y: 0, button: 'left', type };
}

beforeEach(() => {
    DragState.activeDragId = null;
    DragState.isDragging = false;
});

describe('DraggableWidget', () => {
    it('space key starts dragging and sets DragState', () => {
        const widget = new DraggableWidget({ id: 'a' });
        widget.handleKey(keyEvent('space'));

        expect(DragState.isDragging).toBe(true);
        expect(DragState.activeDragId).toBe('a');
    });

    it('mousedown starts a drag', () => {
        const widget = new DraggableWidget({ id: 'a' });
        widget.handleMouse(mouseEvent('mousedown'));

        expect(DragState.isDragging).toBe(true);
        expect(DragState.activeDragId).toBe('a');
    });

    it('escape key cancels dragging and resets DragState', () => {
        const widget = new DraggableWidget({ id: 'a' });
        widget.handleKey(keyEvent('space'));
        widget.handleKey(keyEvent('escape'));

        expect(DragState.isDragging).toBe(false);
        expect(DragState.activeDragId).toBeNull();
    });

    it('space key while already dragging cancels the drag', () => {
        const widget = new DraggableWidget({ id: 'a' });
        widget.handleKey(keyEvent('space'));
        widget.handleKey(keyEvent('space'));

        expect(DragState.isDragging).toBe(false);
        expect(DragState.activeDragId).toBeNull();
    });

    it('onDragStart callback is called when drag starts', () => {
        const onDragStart = vi.fn();
        const widget = new DraggableWidget({ id: 'a', onDragStart });
        widget.handleKey(keyEvent('space'));

        expect(onDragStart).toHaveBeenCalledOnce();
    });

    it('onDragStart is not called again when drag is already active for this widget', () => {
        const onDragStart = vi.fn();
        const widget = new DraggableWidget({ id: 'a', onDragStart });
        widget.handleKey(keyEvent('space'));
        widget.handleKey(keyEvent('space')); // second press cancels, not restarts

        expect(onDragStart).toHaveBeenCalledTimes(1);
    });

    it('markDirty is called when drag starts', () => {
        const widget = new DraggableWidget({ id: 'a' });
        const spy = vi.spyOn(widget, 'markDirty');
        widget.handleKey(keyEvent('space'));

        expect(spy).toHaveBeenCalled();
    });

    it('markDirty is called when drag cancels via escape', () => {
        const widget = new DraggableWidget({ id: 'a' });
        widget.handleKey(keyEvent('space'));
        widget.clearDirty();

        const spy = vi.spyOn(widget, 'markDirty');
        widget.handleKey(keyEvent('escape'));

        expect(spy).toHaveBeenCalled();
    });

    it('escape on a non-dragging widget is a no-op', () => {
        const widget = new DraggableWidget({ id: 'a' });
        widget.handleKey(keyEvent('escape'));

        expect(DragState.isDragging).toBe(false);
        expect(DragState.activeDragId).toBeNull();
    });
});

describe('DroppableWidget', () => {
    it('enter key triggers drop when a drag is active', () => {
        const onDrop = vi.fn();
        DragState.isDragging = true;
        DragState.activeDragId = 'dragged';

        const widget = new DroppableWidget({ id: 'target', onDrop });
        widget.handleKey(keyEvent('enter'));

        expect(onDrop).toHaveBeenCalledWith('dragged');
    });

    it('space key triggers drop when a drag is active', () => {
        const onDrop = vi.fn();
        DragState.isDragging = true;
        DragState.activeDragId = 'dragged';

        const widget = new DroppableWidget({ id: 'target', onDrop });
        widget.handleKey(keyEvent('space'));

        expect(onDrop).toHaveBeenCalledWith('dragged');
    });

    it('mouseup triggers drop when a drag is active', () => {
        const onDrop = vi.fn();
        DragState.isDragging = true;
        DragState.activeDragId = 'dragged';

        const widget = new DroppableWidget({ id: 'target', onDrop });
        widget.handleMouse(mouseEvent('mouseup'));

        expect(onDrop).toHaveBeenCalledWith('dragged');
    });

    it('onDrop receives the correct dragged widget id', () => {
        const onDrop = vi.fn();
        DragState.isDragging = true;
        DragState.activeDragId = 'widget-42';

        const widget = new DroppableWidget({ id: 'target', onDrop });
        widget.handleKey(keyEvent('enter'));

        expect(onDrop).toHaveBeenCalledWith('widget-42');
    });

    it('drop clears DragState', () => {
        DragState.isDragging = true;
        DragState.activeDragId = 'dragged';

        const widget = new DroppableWidget({ id: 'target' });
        widget.handleKey(keyEvent('enter'));

        expect(DragState.isDragging).toBe(false);
        expect(DragState.activeDragId).toBeNull();
    });

    it('drop is a no-op when no drag is active', () => {
        const onDrop = vi.fn();
        const widget = new DroppableWidget({ id: 'target', onDrop });
        widget.handleKey(keyEvent('enter'));

        expect(onDrop).not.toHaveBeenCalled();
        expect(DragState.isDragging).toBe(false);
    });

    it('markDirty is called after a successful drop', () => {
        DragState.isDragging = true;
        DragState.activeDragId = 'dragged';

        const widget = new DroppableWidget({ id: 'target' });
        const spy = vi.spyOn(widget, 'markDirty');
        widget.handleKey(keyEvent('enter'));

        expect(spy).toHaveBeenCalled();
    });

    it('markDirty is not called when drop is a no-op', () => {
        const widget = new DroppableWidget({ id: 'target' });
        widget.clearDirty();
        const spy = vi.spyOn(widget, 'markDirty');
        widget.handleKey(keyEvent('enter'));

        expect(spy).not.toHaveBeenCalled();
    });
});
