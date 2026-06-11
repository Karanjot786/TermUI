// Screen Recorder
export interface FrameData {
    timestamp: number;
    buffer: string;
}

export class ScreenRecorder {
    private frames: FrameData[] = [];
    private startTime: number = Date.now();
    private maxFrames?: number;

    constructor(options?: { maxFrames?: number }) {
        this.maxFrames = options?.maxFrames;
    }

    public recordFrame(buffer: string) {
        if (this.maxFrames !== undefined && this.frames.length >= this.maxFrames) {
            this.frames.shift(); // Remove oldest frame
        }
        this.frames.push({
            timestamp: Date.now() - this.startTime,
            buffer
        });
    }

    public getFrames(): FrameData[] {
        return [...this.frames];
    }

    public clear(): void {
        this.frames = [];
        this.startTime = Date.now();
    }
}
