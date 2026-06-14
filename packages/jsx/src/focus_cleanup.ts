import type { FocusContextValue } from './focus-context.js';

// Focus unmount cleanups with fallback routing
export const autoBlurNode = (focusManager: FocusContextValue, nodeId: string) => {
    if (focusManager.focused !== nodeId) {
        return;
    }

    // Find the widget instance matching nodeId
    const instances = (globalThis as any).__termuijs_instances;
    let widget: any = null;
    if (instances instanceof Map) {
        for (const w of instances.keys()) {
            if (w.id === nodeId) {
                widget = w;
                break;
            }
        }
    }

    // Walk up the parent chain to find the nearest focusable ancestor
    let ancestorId: string | null = null;
    let current = widget ? widget.parent : null;
    while (current) {
        if (current.focusable) {
            ancestorId = current.id;
            break;
        }
        current = current.parent;
    }

    if (ancestorId) {
        focusManager.focus(ancestorId);
    } else {
        // Fallback: try to find the first other focusable widget in the tree
        let fallbackId: string | null = null;
        if (instances instanceof Map) {
            for (const w of instances.keys()) {
                if (w.focusable && w.id !== nodeId) {
                    fallbackId = w.id;
                    break;
                }
            }
        }
        if (fallbackId) {
            focusManager.focus(fallbackId);
        } else {
            focusManager.blur();
        }
    }
};
