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

    it('installs a watcher and waits when the file does not exist at start', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const stream = tail('/tmp/missing.log', { initialLines: 100 });

        expect(stream.lines).toEqual(['[waiting for /tmp/missing.log]']);
        expect(stream.active).toBe(true);
        expect(fs.watchFile).toHaveBeenCalledWith(
            '/tmp/missing.log',
            { interval: 500 },
            expect.any(Function),
        );
        expect(watchCallback).not.toBeNull();
    });

    it('begins tailing once a missing file is created', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const stream = tail('/tmp/created-later.log', { initialLines: 100 });
        expect(stream.lines).toEqual(['[waiting for /tmp/created-later.log]']);

        // File now exists with content.
        fileContent = 'first line\n';
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => fileContent);
        vi.mocked(fs.statSync).mockReturnValue(stats(fileContent.length));

        watchCallback!(stats(fileContent.length), stats(0));

        expect(stream.lines).toEqual(['first line']);

        // Subsequent appends continue tailing normally.
        appendAndWatch('second line\n', stream);
        expect(stream.lines).toEqual(['first line', 'second line']);
    });

    it('re-enters a waiting state when the file is deleted, and resumes on recreation', () => {
        const stream = tail('/tmp/rotated.log', { initialLines: 100 });

        appendAndWatch('before rotation\n', stream);
        expect(stream.lines).toEqual(['before rotation']);

        // File is deleted.
        vi.mocked(fs.existsSync).mockReturnValue(false);
        watchCallback!(stats(0), stats(fileContent.length));

        expect(stream.lines).toEqual(['[waiting for /tmp/rotated.log]']);

        // File reappears with fresh content.
        fileContent = 'after rotation\n';
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => fileContent);
        vi.mocked(fs.statSync).mockReturnValue(stats(fileContent.length));
        watchCallback!(stats(fileContent.length), stats(0));

        expect(stream.lines).toEqual(['after rotation']);
    });

    it('stop() unwatches the file even if it never existed', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const stream = tail('/tmp/never-exists.log');
        stream.stop();

        expect(stream.active).toBe(false);
        // A listener must be passed — omitting it would remove every watcher
        // registered for this path, including ones from unrelated tail() calls.
        expect(fs.unwatchFile).toHaveBeenCalledWith('/tmp/never-exists.log', expect.any(Function));
    });

    it('preserves an unterminated trailing line across the initial read', () => {
        fileContent = 'complete line\nincomplete tail';
        vi.mocked(fs.readFileSync).mockImplementation(() => fileContent);
        vi.mocked(fs.statSync).mockReturnValue(stats(fileContent.length));

        const stream = tail('/tmp/test.log', { initialLines: 100 });

        // "incomplete tail" has no trailing newline yet, so it must be held
        // back rather than emitted as a finished line.
        expect(stream.lines).toEqual(['complete line']);

        appendAndWatch(' end\n', stream);
        expect(stream.lines).toEqual(['complete line', 'incomplete tail end']);
    });

    it('preserves an unterminated trailing line across truncation', () => {
        fileContent = 'a long line that will be truncated\n\n\n\n\n';
        vi.mocked(fs.readFileSync).mockImplementation(() => fileContent);
        vi.mocked(fs.statSync).mockReturnValue(stats(fileContent.length));

        const stream = tail('/tmp/test.log', { initialLines: 100 });

        // Truncate to shorter content with no trailing newline.
        const prevSize = fileContent.length;
        fileContent = 'new incomplete';
        vi.mocked(fs.readFileSync).mockImplementation(() => fileContent);
        vi.mocked(fs.statSync).mockReturnValue(stats(fileContent.length));
        watchCallback!(stats(fileContent.length), stats(prevSize));

        // No trailing newline yet — nothing should be emitted as a complete line.
        expect(stream.lines).toEqual([]);

        appendAndWatch(' line\n', stream);
        expect(stream.lines).toEqual(['new incomplete line']);
    });
});
