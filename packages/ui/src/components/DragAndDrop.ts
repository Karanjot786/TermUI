import type { VNode } from '@termuijs/jsx';
import {
    DraggableWidget,
    DroppableWidget,
    type DraggableOptions,
    type DroppableOptions,
} from '@termuijs/widgets';

export interface DraggableProps extends DraggableOptions {
    children?: VNode | VNode[];
}

export function Draggable(props: DraggableProps): DraggableWidget {
    const { children: _children, ...opts } = props;
    return new DraggableWidget(opts);
}

export interface DroppableProps extends DroppableOptions {
    children?: VNode | VNode[];
}

export function Droppable(props: DroppableProps): DroppableWidget {
    const { children: _children, ...opts } = props;
    return new DroppableWidget(opts);
}
