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
 *
 * The watcher is installed even if `filePath` does not exist yet. Once the
 * file is created, tailing begins automatically. If the file is later
 * deleted or rotated away, the stream re-enters a waiting state and resumes
 * once the file reappears.
 */
export function tail(filePath: string, opts: TailOptions = {}): TailStream {
    const maxLines = opts.maxLines ?? 1000;
    const initialLines = opts.initialLines ?? 20;

    let fileSize = 0;
    let partialLine = '';
    let fileExists = false;

    const stream: TailStream = {
        lines: [`[waiting for ${filePath}]`],
        active: true,
        stop() {
            stream.active = false;
            fs.unwatchFile(filePath);
        },
    };

    /** Read the current contents of the file as the initial buffer. */
    const readInitial = () => {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const allLines = content.split('\n').filter(l => l.length > 0);
            stream.lines = allLines.slice(-initialLines);
            fileSize = fs.statSync(filePath).size;
            partialLine = '';
        } catch {
            // File disappeared between existsSync and the read — go back to waiting.
            fileExists = false;
            fileSize = 0;
            partialLine = '';
            stream.lines = [`[waiting for ${filePath}]`];
        }
    };

    if (fs.existsSync(filePath)) {
        fileExists = true;
        readInitial();
    }

    fs.watchFile(filePath, { interval: 500 }, (curr) => {
        if (!stream.active) {
            fs.unwatchFile(filePath);
            return;
        }

        const exists = fs.existsSync(filePath);

        if (!exists) {
            if (fileExists) {
                // File was deleted or rotated away — wait for it to reappear.
                fileExists = false;
                partialLine = '';
                fileSize = 0;
                stream.lines = [`[waiting for ${filePath}]`];
            }
            return;
        }

        if (!fileExists) {
            // File just appeared — start tailing from its current contents.
            fileExists = true;
            readInitial();
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

    return stream;
}
