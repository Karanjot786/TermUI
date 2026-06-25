export type NotificationType =
    | "info"
    | "success"
    | "warning"
    | "error";

export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    timestamp: Date;
}

export class NotificationHistory {
    private notifications: Notification[] = [];

    add(notification: Notification): void {
        this.notifications.unshift(notification);
    }

    getAll(): Notification[] {
        return this.notifications;
    }

    search(query: string): Notification[] {
        const value = query.toLowerCase();

        return this.notifications.filter(
            item =>
                item.message.toLowerCase().includes(value) ||
                item.type.toLowerCase().includes(value)
        );
    }

    filterByType(type: NotificationType): Notification[] {
        return this.notifications.filter(
            item => item.type === type
        );
    }

    clear(): void {
        this.notifications = [];
    }

    exportLogs(): string {
        return JSON.stringify(
            this.notifications,
            null,
            2
        );
    }
}