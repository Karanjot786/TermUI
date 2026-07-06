// ─────────────────────────────────────────────────────
// @termuijs/core — Renderer Hook & Batching Scheduler
// ─────────────────────────────────────────────────────

type ConsoleMethod = 'log' | 'warn' | 'error';

export class RenderHook {
    private _buffer: string[] = [];
    private _isActive = false;
    private _originalConsole: Partial<Record<ConsoleMethod, (...args: any[]) => void>> = {}; // any[]: console methods accept arbitrary argument shapes

    /** Check if the hook is currently intercepting console output */
    get isActive(): boolean {
        return this._isActive;
    }

    /** Wrap console.log/warn/error to buffer external logs instead of writing to stdout */
    start(): void {
        if (this._isActive) return;
        this._isActive = true;

        const methods: ConsoleMethod[] = ['log', 'warn', 'error'];
        for (const method of methods) {
            this._originalConsole[method] = console[method];
            const hook = this;
            console[method] = function (...args: any[]): void { // any[]: console methods accept arbitrary argument shapes
                const text = args.map(a => typeof a === 'string' ? a : String(a)).join(' ');
                hook._buffer.push(text + '\n');
            };
        }
    }

    /** Restore original console methods */
    stop(): void {
        if (!this._isActive) return;
        this._isActive = false;

        for (const [method, original] of Object.entries(this._originalConsole)) {
            console[method as ConsoleMethod] = original as (...args: any[]) => void; // any[]: console methods accept arbitrary argument shapes
        }
        this._originalConsole = {};
    }

    /** Retrieve and clear the buffered logs */
    flush(): string {
        if (this._buffer.length === 0) return '';
        const out = this._buffer.join('');
        this._buffer = [];
        return out;
    }

    /** Write directly to process.stdout, bypassing any buffering */
    writeRaw(text: string): void {
        process.stdout.write(text);
    }
}
