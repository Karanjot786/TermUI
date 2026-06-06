// ─────────────────────────────────────────────────────
// @termuijs/ui — NotificationCenter
// Provides: NotificationStore (singleton), useNotifications (JSX hook),
// and NotificationCenter (class-based widget).
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import { useState, useEffect, registerCleanup } from '@termuijs/jsx';
import { caps, type Screen } from '@termuijs/core';
import type { Color } from '@termuijs/core';

// Auto-register cleanup for test isolation
registerCleanup(() => {
    NotificationStore.getInstance().reset();
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface Notification {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    durationMs?: number;
    createdAt: number;
}

// ── NotificationStore (singleton) ──────────────────────────────────────────

export class NotificationStore {
    private static _instance: NotificationStore;
    private _notifications: Notification[] = [];
    private _subs: Set<(notifications: Notification[]) => void> = new Set();

    static getInstance(): NotificationStore {
        if (!NotificationStore._instance) {
            NotificationStore._instance = new NotificationStore();
        }
        return NotificationStore._instance;
    }

    push(message: string, type: Notification['type'] = 'info', durationMs?: number): string {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        const notification: Notification = { id, message, type, durationMs, createdAt: Date.now() };
        this._notifications = [...this._notifications, notification];
        this._emit();

        if (durationMs && durationMs > 0) {
            setTimeout(() => this.dismiss(id), durationMs);
        }
        return id;
    }

    dismiss(id: string): void {
        const prev = this._notifications;
        this._notifications = this._notifications.filter(n => n.id !== id);
        if (this._notifications.length !== prev.length) {
            this._emit();
        }
    }

    dismissAll(): void {
        if (this._notifications.length > 0) {
            this._notifications = [];
            this._emit();
        }
    }

    reset(): void {
        this._notifications = [];
        this._subs.clear();
    }

    subscribe(fn: (notifications: Notification[]) => void): () => void {
        this._subs.add(fn);
        return () => this._subs.delete(fn);
    }

    get notifications(): Notification[] {
        return this._notifications;
    }

    private _emit(): void {
        for (const fn of this._subs) fn(this._notifications);
    }
}

/** Global singleton accessor */
export const notifications: NotificationStore = NotificationStore.getInstance();

// ── useNotifications JSX hook ───────────────────────────────────────────────

export function useNotifications(): {
    notifications: Notification[];
    push: (message: string, type?: Notification['type'], durationMs?: number) => string;
    dismiss: (id: string) => void;
    dismissAll: () => void;
} {
    const store = NotificationStore.getInstance();
    const [current, setCurrent] = useState<Notification[]>(store.notifications);

    useEffect(() => {
        const unsub = store.subscribe((ns) => setCurrent([...ns]));
        return unsub;
    }, []);

    return {
        notifications: current,
        push: (msg, type, dur) => store.push(msg, type, dur),
        dismiss: (id) => store.dismiss(id),
        dismissAll: () => store.dismissAll(),
    };
}

// ── NotificationCenter Widget ───────────────────────────────────────────────

export interface NotificationCenterOptions {
    position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
    maxVisible?: number;
    width?: number;
}

const TYPE_ICONS: Record<Notification['type'], { unicode: string; ascii: string }> = {
    info:    { unicode: 'ℹ', ascii: 'i' },
    success: { unicode: '✓', ascii: '+' },
    warning: { unicode: '⚠', ascii: '!' },
    error:   { unicode: '✗', ascii: 'x' },
};

const TYPE_COLORS: Record<Notification['type'], Color> = {
    info:    { type: 'named', name: 'cyan' },
    success: { type: 'named', name: 'green' },
    warning: { type: 'named', name: 'yellow' },
    error:   { type: 'named', name: 'red' },
};

export class NotificationCenter extends Widget {
    private _position: NonNullable<NotificationCenterOptions['position']>;
    private _maxVisible: number;
    private _notifWidth: number;
    private _unsub?: () => void;
    private _current: Notification[] = [];

    constructor(options: NotificationCenterOptions = {}) {
        super();
        this._position = options.position ?? 'top-right';
        this._maxVisible = options.maxVisible ?? 5;
        this._notifWidth = options.width ?? 40;

        const store = NotificationStore.getInstance();
        this._current = store.notifications;
        this._unsub = store.subscribe((ns) => {
            this._current = ns;
            this.markDirty();
        });
    }

    override unmount(): void {
        this._unsub?.();
        this._unsub = undefined;
        this._current = [];
        super.unmount();
    }

    protected override _renderSelf(screen: Screen): void {
        const visible = this._current.slice(-this._maxVisible);
        if (visible.length === 0) return;

        const { x, y, width, height } = this._rect;
        const tw = Math.min(this._notifWidth, width - 2);
        if (tw <= 0) return;

        const isRight = this._position.includes('right');
        const isBottom = this._position.includes('bottom');

        const sx = isRight ? x + width - tw - 1 : x + 1;
        const sy = isBottom ? y + height - visible.length - 1 : y + 1;

        for (let i = 0; i < visible.length; i++) {
            const notif = visible[i];
            const icon = caps.unicode
                ? TYPE_ICONS[notif.type].unicode
                : TYPE_ICONS[notif.type].ascii;

            const raw = `${icon} ${notif.message}`;
            const label = ` ${raw} `.slice(0, tw).padEnd(tw);

            screen.writeString(sx, sy + i, label, {
                fg: TYPE_COLORS[notif.type],
                bold: true,
            });
        }
    }
}
