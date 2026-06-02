import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import { readClipboard } from './ansi.js';

class MockStdin extends EventEmitter {
    on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    off(event: string, listener: (...args: any[]) => void): this {
        return super.off(event, listener);
    }
}

describe('ansi clipboard', () => {
    it('reads clipboard text from OSC 52 response', async () => {
        const stdin = new MockStdin() as any;

        let written = '';
        const stdout = {
            write(data: string) {
                written += data;
                return true;
            },
        } as any;

        const promise = readClipboard(stdin, stdout);

        expect(written).toBe('\x1b]52;c;?\x07');

        stdin.emit(
            'data',
            Buffer.from('\x1b]52;c;aGVsbG8=\x07')
        );

        await expect(promise).resolves.toBe('hello');
    });
});