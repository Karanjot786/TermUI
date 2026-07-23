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
    private _emitting: Set<keyof TEventMap> = new Set();
    private _emitStack: Array<keyof TEventMap> = [];
    private _reentrantQueue: Array<{ event: keyof TEventMap; data: any }> = [];
    private _draining: Set<keyof TEventMap> = new Set();

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
        if (this._emitting.has(event)) {
            if (this._draining.has(event)) {
                return;
            }
            this._reentrantQueue.push({ event, data });
            return;
        }

        this._emitting.add(event);
        this._emitStack.push(event);

        try {
            const onceSet = this._onceHandlers.get(event);
            const onceSnapshot: ((data: any) => void)[] = [];
            if (onceSet) {
                for (const handler of onceSet) {
                    onceSnapshot.push(handler);
                }
                this._onceHandlers.delete(event);
            }

            const handlers = this._handlers.get(event);
            if (handlers) {
                for (const handler of [...handlers]) {
                    try { handler(data); } catch (err) {
                        this.onError?.(event, err);
                    }
                }
            }

            for (const handler of onceSnapshot) {
                try { handler(data); } catch (err) {
                    this.onError?.(event, err);
                }
            }
        } finally {
            this._emitStack.pop();
            this._emitting.delete(event);
        }

        this._drainQueue();
    }

    private _drainQueue(): void {
        while (this._reentrantQueue.length > 0) {
            const queued = this._reentrantQueue.shift()!;
            this._draining.add(queued.event);
            try {
                this.emit(queued.event, queued.data);
            } finally {
                this._draining.delete(queued.event);
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
}
