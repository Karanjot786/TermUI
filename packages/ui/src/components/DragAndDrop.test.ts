import { describe, it, expect, vi } from 'vitest';
import { DraggableWidget, DroppableWidget, DragState } from '../../../widgets/src/layout/DragAndDrop.ts';

describe('DragAndDrop', () => {
    it('initiates drag and updates activeDragId on space key', () => {
        DragState.activeDragId = null;
        DragState.isDragging = false;
        
        const onDragStart = vi.fn();
        const draggable = new DraggableWidget({ id: 'item-1', onDragStart });
        
        draggable.handleKey({ key: 'space', ctrl: false, meta: false, shift: false });
        
        expect(onDragStart).toHaveBeenCalled();
        expect(DragState.isDragging).toBe(true);
        expect(DragState.activeDragId).toBe('item-1');
    });

    it('cancels drag on escape key', () => {
        DragState.activeDragId = 'item-1';
        DragState.isDragging = true;
        
        const draggable = new DraggableWidget({ id: 'item-1' });
        draggable.handleKey({ key: 'escape', ctrl: false, meta: false, shift: false });
        
        expect(DragState.isDragging).toBe(false);
        expect(DragState.activeDragId).toBe(null);
    });

    it('receives active drag ID on drop via space key', () => {
        DragState.activeDragId = 'item-2';
        DragState.isDragging = true;
        
        const onDrop = vi.fn();
        const droppable = new DroppableWidget({ id: 'zone-1', onDrop });
        
        droppable.handleKey({ key: 'space', ctrl: false, meta: false, shift: false });
        
        expect(onDrop).toHaveBeenCalledWith('item-2');
        expect(DragState.isDragging).toBe(false);
        expect(DragState.activeDragId).toBe(null);
    });

    it('handles mouse drag and drop', () => {
        DragState.activeDragId = null;
        DragState.isDragging = false;
        
        const onDragStart = vi.fn();
        const draggable = new DraggableWidget({ id: 'item-mouse', onDragStart });
        
        draggable.handleMouse({ type: 'mousedown', x: 0, y: 0, button: 'left' });
        
        expect(onDragStart).toHaveBeenCalled();
        expect(DragState.isDragging).toBe(true);
        expect(DragState.activeDragId).toBe('item-mouse');
        
        const onDrop = vi.fn();
        const droppable = new DroppableWidget({ id: 'zone-mouse', onDrop });
        
        droppable.handleMouse({ type: 'mouseup', x: 0, y: 0, button: 'left' });
        
        expect(onDrop).toHaveBeenCalledWith('item-mouse');
        expect(DragState.isDragging).toBe(false);
        expect(DragState.activeDragId).toBe(null);
    });
});
