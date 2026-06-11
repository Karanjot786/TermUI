import type { FocusContextValue } from './focus-context.js';

// Focus unmount cleanups
export const autoBlurNode = (focusManager: FocusContextValue, nodeId: string) => {
    if (focusManager.focused === nodeId) {
        focusManager.blur();
    }
};
