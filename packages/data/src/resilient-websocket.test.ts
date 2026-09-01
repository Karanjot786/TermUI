import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResilientWebSocket } from './resilient-websocket.js';

// Mock WebSocket implementation for unit testing
class MockWebSocket {
    static instances: MockWebSocket[] = [];
    url: string;
    readyState = 0; // CONNECTING
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: any }) => void) | null = null;
    onerror: ((err: any) => void) | null = null;
    onclose: ((event: { code: number; reason: string }) => void) | null = null;
    sentData: any[] = [];

    constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
    }

    send(data: any) {
        this.sentData.push(data);
    }

    close(code = 1000, reason = '') {
        this.readyState = 3; // CLOSED
        this.onclose?.({ code, reason });
    }

    simulateOpen() {
        this.readyState = 1; // OPEN
        this.onopen?.();
    }

    simulateMessage(data: any) {
        this.onmessage?.({ data });
    }

    simulateError(err: any) {
        this.onerror?.(err);
    }
}

describe('ResilientWebSocket', () => {
    beforeEach(() => {
        MockWebSocket.instances = [];
        (globalThis as any).WebSocket = MockWebSocket as any;
    });

    afterEach(() => {
        delete (globalThis as any).WebSocket;
    });

    it('initializes and connects automatically', () => {
        const ws = new ResilientWebSocket('wss://example.com/stream');
        expect(ws.status).toBe('CONNECTING');
        expect(MockWebSocket.instances.length).toBe(1);

        const mockWs = MockWebSocket.instances[0];
        mockWs.simulateOpen();
        expect(ws.status).toBe('OPEN');
    });

    it('queues offline messages and flushes them upon successful connection', () => {
        const ws = new ResilientWebSocket('wss://example.com/stream', {
            autoConnect: false,
            queueOfflineMessages: true,
        });

        expect(ws.status).toBe('CLOSED');

        // Send while offline
        const sentOffline = ws.send({ type: 'ping' });
        expect(sentOffline).toBe(false);
        expect(ws.messageQueueLength).toBe(1);

        // Connect
        ws.connect();
        const mockWs = MockWebSocket.instances[0];
        mockWs.simulateOpen();

        expect(ws.status).toBe('OPEN');
        expect(ws.messageQueueLength).toBe(0);
        expect(mockWs.sentData).toEqual([JSON.stringify({ type: 'ping' })]);
    });

    it('schedules exponential backoff reconnect attempt when connection drops', async () => {
        const ws = new ResilientWebSocket('wss://example.com/stream', {
            reconnectBackoff: { initialMs: 10, maxMs: 100, factor: 2 },
        });

        const mockWs1 = MockWebSocket.instances[0];
        mockWs1.simulateOpen();
        expect(ws.status).toBe('OPEN');

        const reconnectSpy = vi.fn();
        ws.events.on('reconnectAttempt', reconnectSpy);

        // Simulate dropped connection
        mockWs1.close(1006, 'Abnormal closure');

        expect(ws.status).toBe('RECONNECTING');

        // Wait for reconnect timer
        await new Promise((r) => setTimeout(r, 30));

        expect(reconnectSpy).toHaveBeenCalled();
        expect(MockWebSocket.instances.length).toBe(2);
    });

    it('stops reconnecting on manual disconnect', () => {
        const ws = new ResilientWebSocket('wss://example.com/stream');
        const mockWs = MockWebSocket.instances[0];
        mockWs.simulateOpen();

        ws.disconnect();
        expect(ws.status).toBe('CLOSED');
        expect(MockWebSocket.instances.length).toBe(1);
    });
});
