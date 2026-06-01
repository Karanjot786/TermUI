export class RenderHook {
    private _originalWrite: typeof process.stdout.write | null = null;
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
        this._originalWrite = process.stdout.write;

        process.stdout.write = (
            chunk: any,
            encodingOrCb?: any,
            cb?: any
        ): boolean => {
            const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
            this._buffer.push(text);

            // Handle Node stream callback variations
            const callback = typeof encodingOrCb === 'function' ? encodingOrCb : cb;
            if (typeof callback === 'function') {
                callback();
            }
            return true; 
        };
    }

    /** Restore original stdout behavior */
    stop(): void {
        if (!this._isActive || !this._originalWrite) return;
        process.stdout.write = this._originalWrite;
        this._originalWrite = null;
        this._isActive = false;
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
        if (this._originalWrite) {
            this._originalWrite.call(process.stdout, text);
        } else {
            process.stdout.write(text);
        }
    }
}