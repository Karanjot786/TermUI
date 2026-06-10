import { createElement } from '@termuijs/jsx';
import type { VNode } from '@termuijs/jsx';

export interface ContextMenuProps {
    x?: number;
    y?: number;
    visible?: boolean;
    children?: VNode | VNode[];
}

export function ContextMenu({ x = 0, y = 0, visible = false, children }: ContextMenuProps) {
    if (!visible) return null;

    return createElement(
        'box',
        {
            style: {
                x,
                y,
                zIndex: 9999, // Float above everything
                border: 'single',
                bg: 'gray',
            }
        },
        children
    );
}
