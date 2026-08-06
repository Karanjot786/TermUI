import { writeFile } from 'node:fs/promises';

// Screen Recorder Frame Data
export interface FrameData {
    timestamp: number;
    buffer: string;
}

export interface ScreenRecorderOptions {
    maxFrames?: number;
    enabled?: boolean;
    now?: () => number;
}

/**
 * ScreenRecorder — recording utility for terminal output frames.
 * Can export in asciicast v2 format for asciinema compatibility, or as SVG.
 */
export class ScreenRecorder {
    private frames: FrameData[] = [];
    private startTime: number;
    private maxFrames?: number;
    private enabled = true;
    private now: () => number;

    constructor(options?: ScreenRecorderOptions) {
        const maxFrames = options?.maxFrames;
        if (maxFrames !== undefined && (!Number.isInteger(maxFrames) || maxFrames <= 0)) {
            throw new Error("maxFrames must be a positive integer");
        }
        this.maxFrames = maxFrames;
        this.now = options?.now ?? Date.now;
        this.startTime = this.now();
        // Enabled by default unless set to false or RECORD_DISABLED=1 env is present
        this.enabled = options?.enabled ?? (process.env.RECORD_DISABLED !== '1');
    }

    /**
     * Enable recording.
     */
    public enable(): void {
        this.enabled = true;
    }

    /**
     * Disable recording.
     */
    public disable(): void {
        this.enabled = false;
    }

    /**
     * Check if recorder is currently enabled.
     */
    public isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Record a terminal output frame.
     */
    public recordFrame(buffer: string): void {
        if (!this.enabled) return;

        if (this.maxFrames !== undefined && this.frames.length >= this.maxFrames) {
            this.frames.shift(); // Remove oldest frame
        }
        this.frames.push({
            timestamp: this.now() - this.startTime,
            buffer
        });
    }

    /**
     * Retrieve all currently buffered frames.
     * Returns a new array containing a shallow copy of each frame object.
     */
    public getFrames(): FrameData[] {
        return this.frames.map((frame) => ({ ...frame }));
    }

    /**
     * Clear all recorded frames and reset the elapsed timer.
     * Note: Subsequent frames will have timestamps relative to when clear() was called.
     */
    public clear(): void {
        this.frames = [];
        this.startTime = this.now();
    }

    /**
     * Serializes recorded frames to asciicast v2 NDJSON format.
     */
    public toAsciicast(options?: { title?: string; width?: number; height?: number }): string {
        const width = options?.width ?? 80;
        const height = options?.height ?? 24;
        const title = options?.title ?? 'TermUI Screen Recording';

        const header = {
            version: 2,
            width,
            height,
            timestamp: Math.floor(this.startTime / 1000),
            title,
            env: { TERM: 'xterm-256color' }
        };

        const lines = [JSON.stringify(header)];

        for (const frame of this.frames) {
            const timeOffset = frame.timestamp / 1000.0;
            lines.push(JSON.stringify([timeOffset, 'o', frame.buffer]));
        }

        return lines.join('\n');
    }

    /**
     * Alias/overload to satisfy alternative exportCast / exportAsAsciicast requirements.
     */
    public exportCast(width: number, height: number, options?: { title?: string }): string {
        return this.toAsciicast({ width, height, title: options?.title });
    }

    /**
     * Exports the asciicast output directly to a file on disk.
     */
    public async exportCastToFile(filePath: string, options?: { title?: string; width?: number; height?: number }): Promise<void> {
        const content = this.toAsciicast(options);
        await writeFile(filePath, content, 'utf8');
    }

    /**
     * Convert recorded frames into a static SVG image representing the last frame.
     */
    public toSVG(options?: { width?: number; height?: number; frameIndex?: number }): string {
        const targetIndex = options?.frameIndex ?? (this.frames.length - 1);
        if (this.frames.length === 0 || targetIndex < 0 || targetIndex >= this.frames.length) {
            return '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><text y="20">No Frames</text></svg>';
        }

        const frame = this.frames[targetIndex];
        const lines = frame.buffer.split('\n');
        const width = options?.width ?? 800;
        const height = options?.height ?? (lines.length * 20 + 40);

        let svgLines = '';
        let yOffset = 25;
        for (const line of lines) {
            // Basic escape of special XML characters in TUI lines
            const escapedLine = line
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
            svgLines += `  <text x="15" y="${yOffset}" fill="#DCDCCC" font-family="Courier, monospace" font-size="14" xml:space="preserve">${escapedLine}</text>\n`;
            yOffset += 18;
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#1E1E1E" rx="5" />
${svgLines}</svg>`;
    }
}
