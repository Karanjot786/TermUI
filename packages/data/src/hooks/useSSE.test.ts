import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let stateValues: unknown[] = [];
let stateSetters: Array<ReturnType<typeof vi.fn>> = [];
let effectCb: (() => (() => void) | void) | null = null;
let stateCallCount = 0;

vi.mock('@termuijs/jsx', () => ({
    useState: (initial: unknown) => {
        const id = stateCallCount++;
        if (stateValues[id] === undefined) {
            stateValues[id] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
        }
        if (!stateSetters[id]) {
            stateSetters[id] = vi.fn((newVal: unknown) => {
                stateValues[id] =
                    typeof newVal === 'function'
                        ? (newVal as (prev: unknown) => unknown)(stateValues[id])
                        : newVal;
            });
        }
        return [stateValues[id], stateSetters[id]];
    },
    useEffect: (cb: () => (() => void) | void) => {
        effectCb = cb;
    },
    useInterval: vi.fn(),
}));

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

let activeSources: MockEventSource[] = [];

class MockEventSource {
    url: string;
    private messageHandler: ((e: { data: string }) => void) | null = null;

    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    close = vi.fn();
    onmessage: ((e: any) => void) | null = null;
    onerror: ((e: any) => void) | null = null;

    constructor(url: string) {
        this.url = url;
        activeSources.push(this);
        this.addEventListener.mockImplementation((type: string, handler: (e: { data: string }) => void) => {
            if (type === 'message') {
                this.messageHandler = handler;
            }
        });
    }

    triggerMessage(data: string) {
        this.messageHandler?.({ data });
    }
}

const { useSSE } = await import('./useSSE.js');

describe('useSSE', () => {
    beforeEach(() => {
        stateValues = [];
        stateSetters = [];
        stateCallCount = 0;
        effectCb = null;
        activeSources = [];
        vi.stubGlobal('EventSource', MockEventSource);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns initial loading state', () => {
        const result = useSSE('https://example.com/events');

        expect(result.loading).toBe(true);
        expect(result.data).toBeNull();
        expect(result.error).toBeNull();
    });

    it('returns data after async resolution', async () => {
        useSSE('https://example.com/events');

        if (effectCb) {
            effectCb();
        }

        const source = activeSources[0];
        expect(source.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
        source.triggerMessage('live-update');

        await flushPromises();

        expect(stateValues[0]).toBe('live-update');
        expect(stateValues[1]).toBeNull();
        expect(stateValues[2]).toBe(false);
    });

    it('cleanup runs on unmount', () => {
        useSSE('https://example.com/events');

        if (effectCb) {
            const cleanup = effectCb();
            const source = activeSources[0];

            expect(source.close).not.toHaveBeenCalled();

            if (typeof cleanup === 'function') {
                cleanup();
            }

            expect(source.close).toHaveBeenCalledTimes(1);
        }
    });

    it('error state is set when operation fails', async () => {
        useSSE('https://example.com/events');

        if (effectCb) {
            effectCb();
        }

        const source = activeSources[0];
        source.onerror?.({});

        await flushPromises();

        expect(stateValues[0]).toBeNull();
        expect(stateValues[1]).toBeInstanceOf(Error);
        expect((stateValues[1] as Error).message).toBe('SSE connection error');
        expect(stateValues[2]).toBe(false);
    });
});
