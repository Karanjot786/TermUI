
import process from 'node:process';
/**
 * Coordinated Frame Scheduler
 * 
 * Prevents terminal I/O bottlenecks by batching state updates into 
 * fixed windows (default 30 FPS). This prevents "render spamming" 
 * where multiple high-frequency hooks trigger independent VDOM diffs.
 */
export class Scheduler {
    private _queue = new Set<() => void>();
    private _timer: ReturnType<typeof setTimeout> | null = null;
    private _fps = 30;

    /**
     * Enqueues a state mutation task. 
     * If a frame is already scheduled, the task will be bundled with it.
     */
    enqueue(update: () => void): void {
        this._queue.add(update);
        this.scheduleFrame();
    }

    /**
     * Configures the maximum target framerate.
     */
    setFPS(fps: number): void {
        this._fps = fps;
    }

    private scheduleFrame(): void {
        if (this._timer) return;

        // Use a window based on target FPS (e.g., ~33ms for 30fps)
        const delay = Math.floor(1000 / this._fps);
        
        this._timer = setTimeout(() => {
            this.flush();
        }, delay);
    }

    /**
     * Synchronously flushes all queued mutations.
     * This should trigger exactly one reconciliation pass in the framework.
     */
    flush(): void {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }

        if (this._queue.size === 0) return;

        // Take a snapshot of the current queue and clear it immediately.
        // This ensures the scheduler is ready for the next frame and 
        // remains resilient even if an update throws an error.
        const tasks = Array.from(this._queue);
        this._queue.clear();

        for (const update of tasks) {
            try {
                update();
            } catch (error) {
                // Write to stderr to avoid interfering with the main terminal buffer
                process.stderr.write(`[Scheduler] Task failed: ${error}\n`);
            }
        }
    }
}

/**
 * Global scheduler instance for coordinated updates.
 */
export const scheduler = new Scheduler();