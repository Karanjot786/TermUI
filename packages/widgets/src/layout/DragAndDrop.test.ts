// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for DraggableWidget and DroppableWidget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Screen, type KeyEvent, type MouseEvent as TermMouseEvent } from '@termuijs/core';
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

    it('onDragEnd callback is called when drag is cancelled via escape', () => {
        const onDragEnd = vi.fn();
        const widget = new DraggableWidget({ id: 'a', onDragEnd });
        widget.handleKey(keyEvent('space'));
        widget.handleKey(keyEvent('escape'));

        expect(onDragEnd).toHaveBeenCalledOnce();
    });

    it('onDragEnd callback is called when drag is cancelled via a second space press', () => {
        const onDragEnd = vi.fn();
        const widget = new DraggableWidget({ id: 'a', onDragEnd });
        widget.handleKey(keyEvent('space'));
        widget.handleKey(keyEvent('space'));

        expect(onDragEnd).toHaveBeenCalledOnce();
    });

    it('renders transparently and does not modify the screen output', () => {
        const drag = new DraggableWidget({ id: 'drag-5' });
        const screen = new Screen(10, 10);
        drag.updateRect({ x: 0, y: 0, width: 5, height: 5 });
        drag.render(screen);

        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                expect(screen.back[r][c].char).toBe(' ');
            }
        }
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

    it('onDragEnd on the dragged widget fires after a successful drop', () => {
        const onDragEnd = vi.fn();
        const draggable = new DraggableWidget({ id: 'dragged', onDragEnd });
        draggable.handleKey(keyEvent('space'));

        const droppable = new DroppableWidget({ id: 'target' });
        droppable.handleKey(keyEvent('enter'));

        expect(onDragEnd).toHaveBeenCalledOnce();
    });

    it('onDragEnd on the dragged widget fires after a mouseup drop', () => {
        const onDragEnd = vi.fn();
        const draggable = new DraggableWidget({ id: 'dragged', onDragEnd });
        draggable.handleMouse(mouseEvent('mousedown'));

        const droppable = new DroppableWidget({ id: 'target' });
        droppable.handleMouse(mouseEvent('mouseup'));

        expect(onDragEnd).toHaveBeenCalledOnce();
    });

    it('onDragEnd is not called on drop when the dragged id has no registered draggable', () => {
        DragState.isDragging = true;
        DragState.activeDragId = 'unregistered';

        const widget = new DroppableWidget({ id: 'target' });
        expect(() => widget.handleKey(keyEvent('enter'))).not.toThrow();
        expect(DragState.isDragging).toBe(false);
    });

    it('onDragEnter fires with the dragged id when a drag is hovering', () => {
        const onDragEnter = vi.fn();
        DragState.isDragging = true;
        DragState.activeDragId = 'dragged';

        const widget = new DroppableWidget({ id: 'target', onDragEnter });
        widget.handleMouse(mouseEvent('mouseenter'));

        expect(onDragEnter).toHaveBeenCalledWith('dragged');
    });

    it('onDragEnter is not called when no drag is active', () => {
        const onDragEnter = vi.fn();
        const widget = new DroppableWidget({ id: 'target', onDragEnter });
        widget.handleMouse(mouseEvent('mouseenter'));

        expect(onDragEnter).not.toHaveBeenCalled();
    });

    it('onDragLeave fires with the dragged id when a drag stops hovering', () => {
        const onDragLeave = vi.fn();
        DragState.isDragging = true;
        DragState.activeDragId = 'dragged';

        const widget = new DroppableWidget({ id: 'target', onDragLeave });
        widget.handleMouse(mouseEvent('mouseleave'));

        expect(onDragLeave).toHaveBeenCalledWith('dragged');
    });

    it('onDragLeave is not called when no drag is active', () => {
        const onDragLeave = vi.fn();
        const widget = new DroppableWidget({ id: 'target', onDragLeave });
        widget.handleMouse(mouseEvent('mouseleave'));

        expect(onDragLeave).not.toHaveBeenCalled();
    });

    it('renders transparently and does not modify the screen output', () => {
        const drop = new DroppableWidget({ id: 'drop-3' });
        const screen = new Screen(10, 10);
        drop.updateRect({ x: 0, y: 0, width: 5, height: 5 });
        drop.render(screen);

        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                expect(screen.back[r][c].char).toBe(' ');
            }
        }
    });
});

describe('Group isolation', () => {
    it('a drag active in one group does not affect another group\'s state', () => {
        const onDropA = vi.fn();
        const onDropB = vi.fn();

        const draggableA = new DraggableWidget({ id: 'item-a', group: 'a' });
        const draggableB = new DraggableWidget({ id: 'item-b', group: 'b' });
        const droppableA = new DroppableWidget({ id: 'target-a', group: 'a', onDrop: onDropA });
        const droppableB = new DroppableWidget({ id: 'target-b', group: 'b', onDrop: onDropB });

        draggableA.handleKey(keyEvent('space'));
        draggableB.handleKey(keyEvent('space'));

        // Dropping in group 'b' must only resolve group 'b's drag.
        droppableB.handleKey(keyEvent('enter'));
        expect(onDropB).toHaveBeenCalledWith('item-b');
        expect(onDropA).not.toHaveBeenCalled();

        // Group 'a's drag must still be active — group 'b' resolving did not clear it.
        droppableA.handleKey(keyEvent('enter'));
        expect(onDropA).toHaveBeenCalledWith('item-a');
    });
});
