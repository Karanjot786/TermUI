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
    // Tracks the current emit depth for each event (0 = not emitting, 1 = outermost, 2+ = re-entrant)
    private _emitting: Map<keyof TEventMap, number> = new Map();
    private _skipped: Set<keyof TEventMap> = new Set();

    /** Optional error handler for event handler errors. Called when a handler throws. */
    onError?: (event: keyof TEventMap, error: unknown) => void;

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
        const reg = this._handlers.get(event);
        if (reg) {
            reg.delete(handler);
            if (reg.size === 0) {
                this._handlers.delete(event);
            }
        }

        const once = this._onceHandlers.get(event);
        if (once) {
            once.delete(handler);
            if (once.size === 0) {
                this._onceHandlers.delete(event);
            }
        }
    }

    /**
     * Emit an event to all subscribed handlers.
     *
     * Once handlers are removed from storage _before_ any handler executes
     * so that re-entrant `emit()` calls on the same event cannot re-fire them.
     */
    emit<K extends keyof TEventMap>(event: K, data: TEventMap[K]): void {
        // Snap-shot and remove once handlers before firing anything
        const onceSet = this._onceHandlers.get(event);
        const onceSnapshot: ((data: any) => void)[] = [];
        if (onceSet) {
            for (const handler of onceSet) {
                onceSnapshot.push(handler);
            }
            this._onceHandlers.delete(event);
        }

        // Capture depth before modifying anything — used to detect re-entrancy
        const depth = this._emitting.get(event) ?? 0;
        if (depth === 0) {
            // Outermost emit: start fresh; clear any prior _skipped state for this event
            this._emitting.set(event, 1);
            const handlers = this._handlers.get(event);
            if (handlers) {
                for (const handler of [...handlers]) {
                    try { handler(data); } catch (err) {
                        this.onError?.(event, err);
                    }
                }
            }
            // Detect if any re-entrant emit occurred during this cycle
            const wasReentrant = (this._emitting.get(event) ?? 1) > 1;
            // Set _skipped only if re-entrant emit occurred during this cycle
            if (wasReentrant) {
                this._skipped.add(event);
            } else {
                this._skipped.delete(event);
            }
            // Always clear _emitting so the next emit starts fresh
            this._emitting.delete(event);
        } else {
            // Re-entrant emit: regular handlers are skipped; track this
            this._skipped.add(event);
            this._emitting.set(event, depth + 1);
        }

        // Once handlers — fire removed handlers (fires even on re-entrant emit)
        for (const handler of onceSnapshot) {
            try { handler(data); } catch (err) {
                this.onError?.(event, err);
            }
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

    /**
     * Check if handlers were skipped due to a re-entrant emit call.
     * Returns true if emit() was called re-entrantly (from within a handler),
     * causing regular handlers for this event to be skipped.
     */
    hasSkippedHandlers(event: keyof TEventMap): boolean {
        return this._skipped.has(event);
    }
}
