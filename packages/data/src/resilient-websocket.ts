type ListenerFn = (...args: any[]) => void;

class SimpleEventEmitter {
    private _events = new Map<string, Set<ListenerFn>>();

    on(event: string, fn: ListenerFn): () => void {
        if (!this._events.has(event)) {
            this._events.set(event, new Set());
        }
        this._events.get(event)!.add(fn);
        return () => this.off(event, fn);
    }

    off(event: string, fn: ListenerFn): void {
        const set = this._events.get(event);
        if (set) {
            set.delete(fn);
        }
    }

    emit(event: string, ...args: any[]): void {
        const set = this._events.get(event);
        if (set) {
            for (const fn of Array.from(set)) {
                fn(...args);
            }
        }
    }
}

export interface ReconnectBackoffOptions {
    initialMs?: number;
    maxMs?: number;
    factor?: number;
}

export interface ResilientWebSocketOptions {
    reconnectBackoff?: ReconnectBackoffOptions;
    queueOfflineMessages?: boolean;
    maxQueueSize?: number;
    autoConnect?: boolean;
    protocols?: string | string[];
}

export type WebSocketConnectionStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'RECONNECTING';

export interface ResilientWebSocketEvents {
    open: void;
    message: any;
    error: Error;
    close: { code: number; reason: string };
    reconnectAttempt: { attempt: number; delayMs: number };
    statusChange: WebSocketConnectionStatus;
}

export class ResilientWebSocket {
    private _url: string;
    private _options: ResilientWebSocketOptions;
    private _ws: any = null;
    private _status: WebSocketConnectionStatus = 'CLOSED';
    private _messageQueue: any[] = [];
    private _reconnectAttempt = 0;
    private _reconnectTimer: any = null;
    private _isManualClose = false;
    readonly events = new SimpleEventEmitter();

    constructor(url: string, options: ResilientWebSocketOptions = {}) {
        this._url = url;
        this._options = {
            queueOfflineMessages: true,
            maxQueueSize: 100,
            autoConnect: true,
            ...options,
        };

        if (this._options.autoConnect !== false) {
            this.connect();
        }
    }

    connect(): void {
        if (this._status === 'OPEN' || this._status === 'CONNECTING') return;

        this._isManualClose = false;
        this._setStatus('CONNECTING');

        try {
            const WSConstructor = typeof WebSocket !== 'undefined' ? WebSocket : (globalThis as any).WebSocket;
            if (!WSConstructor) {
                throw new Error('WebSocket is not available in the execution environment');
            }

            this._ws = new WSConstructor(this._url, this._options.protocols);

            this._ws.onopen = () => {
                this._reconnectAttempt = 0;
                this._setStatus('OPEN');
                this.events.emit('open');
                this._flushQueue();
            };

            this._ws.onmessage = (event: any) => {
                this.events.emit('message', event.data);
            };

            this._ws.onerror = (err: any) => {
                this.events.emit('error', err instanceof Error ? err : new Error(String(err)));
            };

            this._ws.onclose = (event: any) => {
                const closeInfo = { code: event?.code ?? 1000, reason: event?.reason ?? '' };
                this.events.emit('close', closeInfo);
                this._ws = null;

                if (!this._isManualClose) {
                    this._scheduleReconnect();
                } else {
                    this._setStatus('CLOSED');
                }
            };
        } catch (err) {
            this.events.emit('error', err instanceof Error ? err : new Error(String(err)));
            if (!this._isManualClose) {
                this._scheduleReconnect();
            } else {
                this._setStatus('CLOSED');
            }
        }
    }

    send(data: any): boolean {
        if (this._status === 'OPEN' && this._ws && this._ws.readyState === 1) {
            this._ws.send(typeof data === 'object' ? JSON.stringify(data) : data);
            return true;
        }

        if (this._options.queueOfflineMessages) {
            const maxQueue = this._options.maxQueueSize ?? 100;
            this._messageQueue.push(data);
            while (this._messageQueue.length > maxQueue) {
                this._messageQueue.shift();
            }
            return false;
        }

        return false;
    }

    disconnect(code = 1000, reason = 'Normal closure'): void {
        this._isManualClose = true;
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        if (this._ws) {
            this._setStatus('CLOSING');
            try {
                this._ws.close(code, reason);
            } catch {
                // Ignore close errors
            }
            this._ws = null;
        }
        this._setStatus('CLOSED');
    }

    private _scheduleReconnect(): void {
        this._setStatus('RECONNECTING');
        this._reconnectAttempt++;

        const backoff = this._options.reconnectBackoff ?? {};
        const initialMs = backoff.initialMs ?? 500;
        const maxMs = backoff.maxMs ?? 10000;
        const factor = backoff.factor ?? 2;

        const delayMs = Math.min(
            maxMs,
            Math.round(initialMs * Math.pow(factor, this._reconnectAttempt - 1))
        );

        this.events.emit('reconnectAttempt', { attempt: this._reconnectAttempt, delayMs });

        if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            this.connect();
        }, delayMs);
    }

    private _flushQueue(): void {
        while (this._messageQueue.length > 0 && this._status === 'OPEN') {
            const msg = this._messageQueue.shift();
            this.send(msg);
        }
    }

    private _setStatus(status: WebSocketConnectionStatus): void {
        if (this._status !== status) {
            this._status = status;
            this.events.emit('statusChange', status);
        }
    }

    get status(): WebSocketConnectionStatus {
        return this._status;
    }

    get messageQueueLength(): number {
        return this._messageQueue.length;
    }

    get reconnectAttempt(): number {
        return this._reconnectAttempt;
    }
}
