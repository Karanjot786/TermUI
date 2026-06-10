import { createElement } from '@termuijs/jsx';
import type { VNode } from '@termuijs/jsx';

export interface DraggableProps {
    id: string;
    onDragStart?: () => void;
    children?: VNode | VNode[];
}

export function Draggable({ id, onDragStart, children }: DraggableProps) {
    return createElement(
        'box',
        {
            onMouseDown: () => {
                if (onDragStart) onDragStart();
            }
        },
        children
    );
}

export interface DroppableProps {
    id: string;
    onDrop?: (draggedId: string) => void;
    children?: VNode | VNode[];
}

export function Droppable({ id, onDrop, children }: DroppableProps) {
    return createElement(
        'box',
        {
            onMouseUp: () => {
                // In a real implementation we would track the currently dragged item.
                // This is a minimal stub for the drop zone.
                if (onDrop) onDrop('mock-dragged-id');
            }
        },
        children
    );
}
