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
            // Pass the specific listener — omitting it would remove every
            // watcher registered for this path, including ones from other
            // tail() calls on the same file.
            fs.unwatchFile(filePath, onWatch);
        },
    };

    /** Read the current contents of the file as the initial buffer. */
    const readInitial = () => {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const allLines = content.split('\n');
            // The last split segment is only "complete" if content ended in
            // a newline. Hold it back as partialLine so it joins correctly
            // with whatever gets appended next, instead of being emitted as
            // a finished line and then duplicated/split on the next append.
            partialLine = allLines.pop() ?? '';
            stream.lines = allLines.filter(l => l.length > 0).slice(-initialLines);
            fileSize = fs.statSync(filePath).size;
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

    const onWatch = (curr: fs.Stats) => {
        if (!stream.active) {
            fs.unwatchFile(filePath, onWatch);
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
            // File was truncated — re-read, again holding back an
            // unterminated trailing line as partialLine (see readInitial).
            const content = fs.readFileSync(filePath, 'utf-8');
            const allLines = content.split('\n');
            partialLine = allLines.pop() ?? '';
            stream.lines = allLines.filter(l => l.length > 0).slice(-maxLines);
            fileSize = curr.size;
        }
    };

    fs.watchFile(filePath, { interval: 500 }, onWatch);

    return stream;
}
