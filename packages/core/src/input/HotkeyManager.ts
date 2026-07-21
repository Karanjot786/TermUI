// ─────────────────────────────────────────────────────
// @termuijs/core — Global Hotkey Manager
// ─────────────────────────────────────────────────────

import type { KeyEvent } from '../events/types.js';

export type HotkeyHandler = (event: KeyEvent) => void;

/**
 * Global HotkeyManager registry.
 * Allows components to register keyboard shortcuts that intercept 
 * events before they bubble through the active focus tree.
 */
export class HotkeyManager {
    private static _registry: Map<string, HotkeyHandler[]> = new Map();

    /**
     * Convert a KeyEvent into a normalized hotkey string (e.g. 'ctrl+s', 'f1').
     */
    static normalizeKey(event: KeyEvent): string {
        const parts: string[] = [];
        if (event.ctrl) parts.push('ctrl');
        if (event.alt) parts.push('alt');
        if (event.shift && event.key.length > 1) parts.push('shift'); // Only add shift modifier for named keys like shift+up
        parts.push(event.key.toLowerCase());
        return parts.join('+');
    }

    /**
     * Register a global hotkey.
     * @param shortcut Normalized shortcut string (e.g., 'ctrl+s')
     * @param handler Callback to execute
     * @returns A cleanup function to unregister the hotkey
     */
    static register(shortcut: string, handler: HotkeyHandler): () => void {
        const key = shortcut.toLowerCase();
        if (!this._registry.has(key)) {
            this._registry.set(key, []);
        }
        this._registry.get(key)!.push(handler);

        // Return unregister callback
        return () => {
            this.unregister(key, handler);
        };
    }

    /**
     * Unregister a previously registered hotkey handler.
     */
    static unregister(shortcut: string, handler: HotkeyHandler): void {
        const key = shortcut.toLowerCase();
        const handlers = this._registry.get(key);
        if (handlers) {
            const idx = handlers.indexOf(handler);
            if (idx !== -1) {
                handlers.splice(idx, 1);
            }
            if (handlers.length === 0) {
                this._registry.delete(key);
            }
        }
    }

    /**
     * Dispatch a KeyEvent to any matching registered global handlers.
     * @returns true if the event was intercepted and handled, false otherwise
     */
    static dispatch(event: KeyEvent): boolean {
        const key = this.normalizeKey(event);
        const handlers = this._registry.get(key);
        
        if (handlers && handlers.length > 0) {
            // Execute the most recently registered handler (LIFO stack like behavior)
            const handler = handlers[handlers.length - 1];
            handler(event);
            return true;
        }
        return false;
    }
}
