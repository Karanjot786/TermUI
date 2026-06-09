// ─────────────────────────────────────────────────────
// @termuijs/core — Renderer Hook & Batching Scheduler
// ─────────────────────────────────────────────────────

export class RenderHook {
    private static _originalWrite: typeof process.stdout.write | null = null;
    private static _refCount = 0;
    private static _suspended = false;
    private static _instances: RenderHook[] = [];
    private _buffer: string[] = [];
    private _isActive = false;

    /** Check if the hook is currently intercepting stdout */
    get isActive(): boolean {
        return this._isActive;
    }

    /** Hijack stdout to buffer external logs */
    start(): void {
        if (this._isActive) return;
        this._isActive = true;
        RenderHook._instances.push(this);
        RenderHook._refCount++;
        if (RenderHook._refCount > 1) return;

        if (RenderHook._originalWrite === null) {
            RenderHook._originalWrite = process.stdout.write;
        }

        const write = (
            chunk: any,
            encodingOrCb?: any,
            cb?: any
        ): boolean => {
            const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
            if (!RenderHook._suspended && RenderHook._instances.length > 0) {
                for (const inst of RenderHook._instances) {
                    inst._buffer.push(text);
                }
                const callback = typeof encodingOrCb === 'function' ? encodingOrCb : cb;
                if (typeof callback === 'function') {
                    callback();
                }
                return true;
            }
            return RenderHook._originalWrite!.call(process.stdout, chunk);
        };
        process.stdout.write = write;
    }

    /** Restore original stdout behavior */
    stop(): void {
        if (!this._isActive || !RenderHook._originalWrite) return;
        this._isActive = false;
        const idx = RenderHook._instances.indexOf(this);
        if (idx >= 0) RenderHook._instances.splice(idx, 1);
        RenderHook._refCount--;
        if (RenderHook._refCount > 0) return;
        process.stdout.write = RenderHook._originalWrite;
    }

    /** Restore stdout globally regardless of which instance hijacked it */
    static globalRestore(): void {
        RenderHook._instances = [];
        RenderHook._refCount = 0;
        RenderHook._suspended = false;
        if (RenderHook._originalWrite) {
            process.stdout.write = RenderHook._originalWrite;
            RenderHook._originalWrite = null;
        }
    }

    /** Temporarily bypass buffering so render output goes directly to stdout */
    static suspendAll(): void {
        RenderHook._suspended = true;
    }

    /** Re-enable buffering after suspendAll */
    static resumeAll(): void {
        RenderHook._suspended = false;
    }

    /** Retrieve and clear the buffered logs */
    flush(): string {
        if (this._buffer.length === 0) return '';
        const out = this._buffer.join('');
        this._buffer = [];
        return out;
    }

    /** Write directly to the terminal, bypassing the buffer */
    writeRaw(text: string): void {
        if (RenderHook._originalWrite) {
            RenderHook._originalWrite.call(process.stdout, text);
        } else {
            process.stdout.write(text);
        }
    }
}

/**
 * Queues a render pass for the next event loop tick.
 * Ensures high-frequency mutations are batched together.
 * * Using .call() or .bind() from the application context invokes this safely.
 */
export function queueUpdate(this: any) {
    setImmediate(() => {
        if (this && typeof this.render === 'function') {
            this.render();
        }
        if (this && typeof this.clearDirty === 'function') {
            this.clearDirty();
        }
    });
}