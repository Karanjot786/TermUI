import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Stats } from 'node:fs';

let watchCallback: ((curr: Stats, prev: Stats) => void) | null = null;
let fileContent = '';

vi.mock('node:fs', () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
    watchFile: vi.fn(),
    unwatchFile: vi.fn(),
    openSync: vi.fn(),
    readSync: vi.fn(),
    closeSync: vi.fn(),
}));

const fs = await import('node:fs');
const { tail } = await import('./tail.js');

function stats(size: number): Stats {
    return { size } as Stats;
}

function appendAndWatch(text: string, stream: ReturnType<typeof tail>): void {
    const prevSize = fileContent.length;
    fileContent += text;
    vi.mocked(fs.statSync).mockReturnValue(stats(fileContent.length));
    watchCallback!(stats(fileContent.length), stats(prevSize));
}

describe('tail', () => {
    beforeEach(() => {
        fileContent = '';
        watchCallback = null;

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => fileContent);
        vi.mocked(fs.statSync).mockReturnValue(stats(0));
        vi.mocked(fs.openSync).mockReturnValue(1);
        vi.mocked(fs.readSync).mockImplementation((_fd, buffer, offset, length, position) => {
            const start = position ?? 0;
            const slice = fileContent.slice(start, start + length);
            Buffer.from(slice).copy(buffer, offset, 0, slice.length);
            return slice.length;
        });
        vi.mocked(fs.watchFile).mockImplementation((_path, _opts, cb) => {
            watchCallback = cb;
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('reassembles lines split across two chunks', () => {
        const stream = tail('/tmp/test.log', { initialLines: 100 });
        expect(watchCallback).not.toBeNull();

        appendAndWatch('hel', stream);
        expect(stream.lines).toEqual([]);

        appendAndWatch('lo\nworld\n', stream);
        expect(stream.lines).toEqual(['hello', 'world']);
    });

    it('buffers incomplete lines until a newline arrives', () => {
        const stream = tail('/tmp/test.log', { initialLines: 100 });

        appendAndWatch('partial line without newline', stream);
        expect(stream.lines).toEqual([]);

        appendAndWatch(' complete\n', stream);
        expect(stream.lines).toEqual(['partial line without newline complete']);
    });

    it('preserves partial buffer across an empty growth read', () => {
        const stream = tail('/tmp/test.log', { initialLines: 100 });

        appendAndWatch('start', stream);
        expect(stream.lines).toEqual([]);

        watchCallback!(stats(fileContent.length), stats(fileContent.length));
        expect(stream.lines).toEqual([]);

        appendAndWatch(' end\n', stream);
        expect(stream.lines).toEqual(['start end']);
    });

    it('emits multiple complete lines from a single chunk', () => {
        const stream = tail('/tmp/test.log', { initialLines: 100 });

        appendAndWatch('line1\nline2\nline3\n', stream);
        expect(stream.lines).toEqual(['line1', 'line2', 'line3']);
    });

    it('resets partial buffer on file truncation', () => {
        fileContent = '\n\n\n\n\n';
        vi.mocked(fs.readFileSync).mockImplementation(() => fileContent);
        vi.mocked(fs.statSync).mockReturnValue(stats(fileContent.length));

        const stream = tail('/tmp/test.log', { initialLines: 100 });

        // Write a partial line with no newline
        appendAndWatch('incomplete', stream);
        expect(stream.lines).toEqual([]);

        // Simulate file truncation — curr.size < fileSize
        // Set fileContent to new truncated content
        const prevSize = fileContent.length;
        fileContent = 'new content\n';
        vi.mocked(fs.readFileSync).mockImplementation(() => fileContent);
        vi.mocked(fs.statSync).mockReturnValue(stats(fileContent.length));
        watchCallback!(stats(fileContent.length), stats(prevSize));

        // Truncation resets partialLine and loads new content via readFileSync
        expect(stream.lines).toEqual(['new content']);

        // Next append must NOT prepend old partial fragment
        appendAndWatch('fresh line\n', stream);
        expect(stream.lines).toEqual(['new content', 'fresh line']);
    });
});
