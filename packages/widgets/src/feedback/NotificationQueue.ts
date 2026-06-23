export type NotificationPriority = "low" | "medium" | "high";

export interface Notification {
    id: string;
    message: string;
    priority?: NotificationPriority;
    duration?: number;
}

const PRIORITY_ORDER: Record<NotificationPriority, number> = { high: 3, medium: 2, low: 1 };

export class NotificationQueue {
    private queue: Notification[] = [];
    private paused = false;

    add(notification: Notification): void {
        if (this.paused) return;
        this.queue.push({ priority: "medium", duration: 3000, ...notification });
        this.queue.sort((a, b) => PRIORITY_ORDER[b.priority!] - PRIORITY_ORDER[a.priority!]);
    }

    next(): Notification | undefined {
        return this.queue.shift();
    }

    getAll(): Notification[] {
        return this.queue;
    }

    remove(id: string): void {
        this.queue = this.queue.filter(item => item.id !== id);
    }

    clear(): void {
        this.queue = [];
    }

    pause(): void { this.paused = true; }
    resume(): void { this.paused = false; }
    isPaused(): boolean { return this.paused; }
}
