import type { FocusContextValue } from './focus-context.js';
import type { Widget } from '@termuijs/widgets';
import { getInstanceMap } from './reconciler.js';

// Focus unmount cleanups with fallback routing
export const autoBlurNode = (focusManager: FocusContextValue, nodeId: string) => {
    if (focusManager.focused !== nodeId) {
        return;
    }

    // Retrieve the instance map via accessor
    const instances = getInstanceMap();
    let widget: Widget & { id: string; focusable: boolean; parent: Widget | null } | null = null;
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
        // Fallback: try to find the first other focusable widget in the tree deterministically (sorted alphabetically by ID)
        let fallbackId: string | null = null;
        if (instances instanceof Map) {
            const candidates: string[] = [];
            for (const w of instances.keys()) {
                if (w.focusable && w.id !== nodeId) {
                    candidates.push(w.id);
                }
            }
            if (candidates.length > 0) {
                candidates.sort();
                fallbackId = candidates[0];
            }
        }
        if (fallbackId) {
            focusManager.focus(fallbackId);
        } else {
            focusManager.blur();
        }
    }
};
