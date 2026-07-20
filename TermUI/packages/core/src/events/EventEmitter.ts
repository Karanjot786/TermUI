// ─────────────────────────────────────────────────────
// @termuijs/core — Typed Event Emitter
// ─────────────────────────────────────────────────────

/**
 * Strongly-typed event emitter using TypeScript generics.
 * Supports `on`, `off`, `once`, `emit` with type-safe event maps.
 */
export class EventEmitter<TEventMap extends Record<string, any>> {
    private _handlers: Map<keyof TEventMap, Set<(data: any) => void>> = new Map();
    private _onceHandlers: Map<keyof TEventMap, Set<(data: any) => void>> = new Map();

    /**
     * Subscribe to an event.
     * @returns Unsubscribe function.
     */
    on<K extends keyof TEventMap>(event: K, handler: (data: TEventMap[K]) => void): () => void {
        if (!this._handlers.has(event)) {
            this._handlers.set(event, new Set());
        }
        this._handlers.get(event)!.add(handler);

        return () => this.off(event, handler);
    }

    /**
     * Subscribe to an event, but only fire once.
     */
    once<K extends keyof TEventMap>(event: K, handler: (data: TEventMap[K]) => void): () => void {
        if (!this._onceHandlers.has(event)) {
            this._onceHandlers.set(event, new Set());
        }
        this._onceHandlers.get(event)!.add(handler);

        return () => {
            this._onceHandlers.get(event)?.delete(handler);
        };
    }

    /**
     * Unsubscribe from an event.
     */
    off<K extends keyof TEventMap>(event: K, handler: (data: TEventMap[K]) => void): void {
        this._handlers.get(event)?.delete(handler);
        this._onceHandlers.get(event)?.delete(handler);
    }

    /**
     * Emit an event to all subscribed handlers.
     */
    emit<K extends keyof TEventMap>(event: K, data: TEventMap[K]): void {
        // Regular handlers
        const handlers = this._handlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                try { handler(data); } catch { /* prevent one handler from breaking others */ }
            }
        }

        // Once handlers — fire and remove
        const onceHandlers = this._onceHandlers.get(event);
        if (onceHandlers) {
            for (const handler of onceHandlers) {
                try { handler(data); } catch { /* prevent one handler from breaking others */ }
            }
            onceHandlers.clear();
        }
    }

    /**
     * Remove all handlers for a specific event, or all events if no event specified.
     */
    removeAll(event?: keyof TEventMap): void {
        if (event) {
            this._handlers.delete(event);
            this._onceHandlers.delete(event);
        } else {
            this._handlers.clear();
            this._onceHandlers.clear();
        }
    }

    /**
     * Check if there are any handlers for an event.
     */
    hasListeners(event: keyof TEventMap): boolean {
        return (
            (this._handlers.get(event)?.size ?? 0) > 0 ||
            (this._onceHandlers.get(event)?.size ?? 0) > 0
        );
    }
}
