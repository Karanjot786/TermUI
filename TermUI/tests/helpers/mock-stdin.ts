import { EventEmitter } from 'events';

/** Fake stdin for testing InputParser without real terminal */
export function createMockStdin(): NodeJS.ReadStream {
    const emitter = new EventEmitter();
    return Object.assign(emitter, {
        isTTY: true,
        setRawMode: () => emitter,
        resume: () => emitter,
        pause: () => emitter,
        ref: () => emitter,
        unref: () => emitter,
        isRaw: true,
    }) as unknown as NodeJS.ReadStream;
}

/** Send raw bytes to mock stdin */
export function sendKey(stdin: NodeJS.ReadStream, data: string | Buffer): void {
    stdin.emit('data', Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'));
}
