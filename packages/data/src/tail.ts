// ─────────────────────────────────────────────────────
// @termuijs/data — File tailing via fs.watch
// ─────────────────────────────────────────────────────

import * as fs from 'node:fs';

export interface TailOptions {
    /** Number of initial lines to read (default: 20) */
    initialLines?: number;
    /** Maximum lines to keep in buffer (default: 1000) */
    maxLines?: number;
}

export interface TailStream {
    /** Current lines in the buffer */
    lines: string[];
    /** Whether the file is being watched */
    active: boolean;
    /** Stop watching */
    stop(): void;
}

/**
 * Tail a file — streams new lines as they're appended.
 * Returns a TailStream with a reactive `lines` array.
 */
export function tail(filePath: string, opts: TailOptions = {}): TailStream {
    const maxLines = opts.maxLines ?? 1000;
    const initialLines = opts.initialLines ?? 20;

    const stream: TailStream = {
        lines: [],
        active: false,
        stop() {
            stream.active = false;
            // Eagerly stop the watcher instead of waiting for next change event
            if ((stream as any)._watchPath) { // as any: _watchPath is runtime-augmented; not in TailStream interface
                fs.unwatchFile((stream as any)._watchPath);
                (stream as any)._watchPath = null;
            }
        },
    };

    try {
        // Read initial lines
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const allLines = content.split('\n').filter(l => l.length > 0);
            stream.lines = allLines.slice(-initialLines);

            let fileSize = fs.statSync(filePath).size;
            stream.active = true;
            (stream as any)._watchPath = filePath;
            let partialLine = '';

            // Watch for changes
            const watcher = fs.watchFile(filePath, { interval: 500 }, (curr) => {
                if (!stream.active) {
                    fs.unwatchFile(filePath);
                    (stream as any)._watchPath = null;
                    return;
                }

                if (curr.size > fileSize) {
                    let fd: number | undefined;
                    try {
                        fd = fs.openSync(filePath, 'r');
                        const buffer = Buffer.alloc(curr.size - fileSize);
                        fs.readSync(fd, buffer, 0, buffer.length, fileSize);

                        const text = partialLine + buffer.toString('utf-8');
                        const lines = text.split('\n');
                        partialLine = lines.pop() ?? '';
                        const newLines = lines.filter(l => l.length > 0);
                        stream.lines.push(...newLines);

                        // Trim to max
                        if (stream.lines.length > maxLines) {
                            stream.lines = stream.lines.slice(-maxLines);
                        }

                        fileSize = curr.size;
                    } catch {
                        // File may have been deleted/moved between stat and read
                    } finally {
                        if (fd !== undefined) fs.closeSync(fd);
                    }
                } else if (curr.size < fileSize) {
                    // File was truncated — re-read
                    partialLine = '';
                    const content = fs.readFileSync(filePath, 'utf-8');
                    stream.lines = content.split('\n').filter(l => l.length > 0).slice(-maxLines);
                    fileSize = curr.size;
                }
            });
        }
    } catch {
        // File doesn't exist yet — return empty
        stream.lines = [`[waiting for ${filePath}]`];
    }

    return stream;
}
