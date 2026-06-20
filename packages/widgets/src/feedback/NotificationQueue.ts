export type NotificationPriority = "low" | "medium" | "high";

export interface Notification {
    id: string;
    message: string;
    priority?: NotificationPriority;
    duration?: number;
}

export class NotificationQueue {
    private queue: Notification[] = [];
    private paused = false;

    add(notification: Notification): void {
        this.queue.push({
            priority: "medium",
            duration: 3000,
            ...notification,
        });

        this.queue.sort((a, b) => {
            const order = {
                high: 3,
                medium: 2,
                low: 1,
            };

            return order[b.priority!] - order[a.priority!];
        });
    }

    getAll(): Notification[] {
        return this.queue;
    }

    remove(id: string): void {
        this.queue = this.queue.filter(
            item => item.id !== id
        );
    }

    clear(): void {
        this.queue = [];
    }

    pause(): void {
        this.paused = true;
    }

    resume(): void {
        this.paused = false;
    }

    isPaused(): boolean {
        return this.paused;
    }
}