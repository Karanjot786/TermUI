import { createElement } from '@termuijs/jsx';
import type { VNode } from '@termuijs/jsx';
import { DraggableWidget, DroppableWidget } from '@termuijs/widgets';

export interface DraggableProps {
    id: string;
    onDragStart?: () => void;
    children?: VNode | VNode[];
}

export function Draggable(props: DraggableProps) {
    return createElement(
        DraggableWidget as any,
        {
            id: props.id,
            onDragStart: props.onDragStart,
        },
        props.children
    );
}

export interface DroppableProps {
    id: string;
    onDrop?: (draggedId: string) => void;
    children?: VNode | VNode[];
}

export function Droppable(props: DroppableProps) {
    return createElement(
        DroppableWidget as any,
        {
            id: props.id,
            onDrop: props.onDrop,
        },
        props.children
    );
}
