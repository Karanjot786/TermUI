// ─────────────────────────────────────────────────────
// @termuijs/core — Renderer Hook & Batching Scheduler
// ─────────────────────────────────────────────────────

type ConsoleMethod = 'log' | 'warn' | 'error' | 'debug' | 'trace' | 'info';

export class RenderHook {
    private _buffer: string[] = [];
    private _isActive = false;
    private _originalConsole = new Map<ConsoleMethod, (...args: any[]) => void>();

    /** Check if the hook is currently intercepting console output */
    get isActive(): boolean {
        return this._isActive;
    }

    /** Wrap console methods to buffer output while still displaying it */
    start(): void {
        if (this._isActive) return;
        this._isActive = true;

        const methods: ConsoleMethod[] = ['log', 'warn', 'error', 'debug', 'trace', 'info'];
        for (const method of methods) {
            const original = (console as any)[method];
            if (typeof original !== 'function') continue;
            this._originalConsole.set(method, original);
            const hook = this;
            (console as any)[method] = function (...args: any[]): void {
                const text = args.map(a => typeof a === 'string' ? a : String(a)).join(' ');
                hook._buffer.push(text + '\n');
                original.apply(console, args);
            };
        }
    }

    /** Restore original console methods */
    stop(): void {
        if (!this._isActive) return;
        this._isActive = false;

        for (const [method, original] of this._originalConsole) {
            (console as any)[method] = original;
        }
        this._originalConsole.clear();
    }

    /** Retrieve and clear the buffered logs */
    flush(): string {
        if (this._buffer.length === 0) return '';
        const out = this._buffer.join('');
        this._buffer = [];
        return out;
    }

    /** Requeue previously flushed logs back to the front of the buffer */
    requeue(logs: string): void {
        if (!logs) return;
        this._buffer.unshift(logs);
    }

    /** Write directly to process.stdout, bypassing any buffering */
    writeRaw(text: string): void {
        process.stdout.write(text);
    }
}
