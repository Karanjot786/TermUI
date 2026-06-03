// ─────────────────────────────────────────────────────
// @termuijs/data — Reactive hooks for system metrics
// ─────────────────────────────────────────────────────

import { useState, useEffect, useInterval, useRef, useCallback } from '@termuijs/jsx';
import { cpu } from './cpu.js';
import { memory } from './memory.js';
import { disk } from './disk.js';
import type { DiskPartition } from './disk.js';
import { network } from './network.js';
import type { NetworkInterface } from './network.js';
import { processes } from './processes.js';
import type { ProcessInfo } from './processes.js';
import { system } from './system.js';
import { http } from './http.js';
import type { HealthResult, Endpoint } from './http.js';

import { getCache, setCache, isFresh, fetchShared } from './cache.js';

// ── CPU ──────────────────────────────────────────────

export interface CpuMetrics {
    percent: number;
    perCore: number[];
    loadAvg: number[];
    model: string;
    count: number;
    speed: number;
}

function snapshotCpu(): CpuMetrics {
    return {
        percent: cpu.percent,
        perCore: cpu.perCore,
        loadAvg: cpu.loadAvg,
        model: cpu.model,
        count: cpu.count,
        speed: cpu.speed,
    };
}

/**
 * useCpu — reactive CPU metrics updated every `intervalMs` milliseconds.
 */
export function useCpu(intervalMs = 1000): CpuMetrics {
    const [metrics, setMetrics] = useState<CpuMetrics>(() => snapshotCpu());
    useInterval(() => setMetrics(snapshotCpu()), intervalMs);
    return metrics;
}

// ── Memory ───────────────────────────────────────────

export interface MemoryMetrics {
    percent: number;
    used: string;
    free: string;
    total: string;
    raw: { used: number; free: number; total: number };
}

function snapshotMemory(): MemoryMetrics {
    return {
        percent: memory.percent,
        used: memory.used,
        free: memory.free,
        total: memory.total,
        raw: memory.raw,
    };
}

/**
 * useMemory — reactive memory metrics updated every `intervalMs` milliseconds.
 */
export function useMemory(intervalMs = 1000): MemoryMetrics {
    const [metrics, setMetrics] = useState<MemoryMetrics>(() => snapshotMemory());
    useInterval(() => setMetrics(snapshotMemory()), intervalMs);
    return metrics;
}

// ── Disk ─────────────────────────────────────────────

export interface DiskMetrics {
    percent: number;
    partitions: DiskPartition[];
    main: DiskPartition | null;
}

function snapshotDisk(): DiskMetrics {
    return {
        percent: disk.percent,
        partitions: disk.partitions,
        main: disk.main,
    };
}

/**
 * useDisk — reactive disk metrics updated every `intervalMs` milliseconds.
 */
export function useDisk(intervalMs = 5000): DiskMetrics {
    const [metrics, setMetrics] = useState<DiskMetrics>(() => snapshotDisk());
    useInterval(() => setMetrics(snapshotDisk()), intervalMs);
    return metrics;
}

// ── Network ──────────────────────────────────────────

export interface NetworkMetrics {
    interfaces: NetworkInterface[];
    ip: string;
    hostname: string;
}

function snapshotNetwork(): NetworkMetrics {
    return {
        interfaces: network.interfaces,
        ip: network.ip,
        hostname: network.hostname,
    };
}

/**
 * useNetwork — reactive network interface info updated every `intervalMs` milliseconds.
 */
export function useNetwork(intervalMs = 5000): NetworkMetrics {
    const [metrics, setMetrics] = useState<NetworkMetrics>(() => snapshotNetwork());
    useInterval(() => setMetrics(snapshotNetwork()), intervalMs);
    return metrics;
}

// ── Processes ────────────────────────────────────────

/**
 * useTopProcesses — reactive top-N process list sorted by CPU, updated every `intervalMs` ms.
 */
export function useTopProcesses(n = 10, intervalMs = 2000): ProcessInfo[] {
    const [procs, setProcs] = useState<ProcessInfo[]>(() => processes.top(n));
    useInterval(() => setProcs(processes.top(n)), intervalMs);
    return procs;
}

// ── System Info ──────────────────────────────────────

export interface SystemInfo {
    platform: string;
    release: string;
    type: string;
    hostname: string;
    uptime: string;
    uptimeSeconds: number;
    user: string;
    arch: string;
    nodeVersion: string;
}

function snapshotSystem(): SystemInfo {
    return {
        platform: system.platform,
        release: system.release,
        type: system.type,
        hostname: system.hostname,
        uptime: system.uptime,
        uptimeSeconds: system.uptimeSeconds,
        user: system.user,
        arch: system.arch,
        nodeVersion: system.nodeVersion,
    };
}

/**
 * useSystemInfo — static system info snapshot (no polling; values are OS-level constants).
 * Uptime is captured once at mount time.
 */
export function useSystemInfo(): SystemInfo {
    const [info] = useState<SystemInfo>(() => snapshotSystem());
    return info;
}

// ── HTTP Health ──────────────────────────────────────

/**
 * useHttpHealth — reactive HTTP health checks for a list of endpoints,
 * updated every `intervalMs` milliseconds.
 *
 * @param endpoints - Array of { name, url } objects or plain URL strings.
 * @param intervalMs - Poll interval in milliseconds (default 10 000).
 */
export function useHttpHealth(
    endpoints: Array<Endpoint | string>,
    intervalMs = 10_000,
): HealthResult[] {
    const normalised: Endpoint[] = endpoints.map(e =>
        typeof e === 'string' ? { name: e, url: e } : e,
    );

    // Stable string key derived from endpoint identities — avoids the
    // cost of JSON.stringify on every render and prevents spurious
    // effect re-runs when the array reference changes but content is the same.
    const endpointKey = normalised
        .map(e => `${e.name}::${e.url}`)
        .join('|');

    const [results, setResults] = useState<HealthResult[]>([]);

    useEffect(() => {
        const controller = new AbortController();
        let mounted = true;

        const check = async () => {
            try {
                const r = await http.checkAll(normalised, controller.signal);
                if (mounted) setResults(r);
            } catch {
                // Ignore errors caused by the cleanup abort or genuine network failures.
                if (!mounted || controller.signal.aborted) return;
            }
        };

        check(); // immediate first fetch

        const id = setInterval(check, intervalMs);
        return () => {
            mounted = false;
            controller.abort();
            clearInterval(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpointKey, intervalMs]);

    return results;
}


// WebSocket

export type WebSocketState = 'connecting' | 'open' | 'closed' | 'error'

export interface UseWebSocketReturn {
    message: string | null;
    state: WebSocketState;
    send: (data: Parameters<WebSocket['send']>[0]) => void;
}

/**
 * useWebSocket — reactive WebSocket connection hook.
 *
 * Connects to the provided `url` and returns the latest text message,
 * the connection `state`, and a `send` function to transmit data.
 *
 * The hook automatically attempts to reconnect on close using
 * exponential backoff (capped at ~10s) and resets retries on open.
 * It cleans up the socket and any pending reconnect timers on unmount.
 *
 * @param url - WebSocket URL to connect to (e.g. `wss://example.com/socket`).
 */
export function useWebSocket(url: string): UseWebSocketReturn {
    const [message, setMessage] = useState<string | null>(null)
    const [state, setState] = useState<WebSocketState>('connecting')

    const socketRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const retryCountRef = useRef(0)

    useEffect(() => {
        let isMounted = true;

        function connect() {
            const socket = new WebSocket(url);
            socketRef.current = socket;
            setState('connecting')

            socket.onopen = () => {
                if (!isMounted) return;
                setState('open');
                retryCountRef.current = 0;
            }

            socket.onmessage = (e) => {
                if (!isMounted) return;
                setMessage(e.data)
            }

            socket.onclose = () => {
                if (!isMounted) return;
                setState('closed')

                const timeout = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
                retryCountRef.current += 1;

                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, timeout)
            }

            socket.onerror = () => {
                if (!isMounted) return;
                setState('error')

            }
        }

        connect();

        return () => {
            isMounted = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
            if (socketRef.current) {
                socketRef.current.close();
            }
        }
    }, [url])

    const send = useCallback((data: Parameters<WebSocket['send']>[0]) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(data)
        } else {
            console.warn("Websocket is not connected.")
        }
    }, [])

    return { message, state, send }
}

// ── Fetch ────────────────────────────────────────────

export interface UseFetchOptions {
    staleTime?: number;
}

export interface UseFetchResult<T> {
    data: T | null;
    error: Error | null;
    loading: boolean;
}

/**
 * useFetch — reactive fetch hook with caching.
 *
 * @param url - The URL to fetch.
 * @param options - Options including `staleTime` in milliseconds.
 */
export function useFetch<T = any>(url: string, options?: UseFetchOptions): UseFetchResult<T> {
    const staleTime = options?.staleTime ?? 0;

    const [data, setData] = useState<T | null>(() => {
        if (isFresh(url)) {
            return getCache<T>(url)?.data ?? null;
        }
        return null;
    });

    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(() => !isFresh(url));

    useEffect(() => {
        if (isFresh(url)) {
            const entry = getCache<T>(url);
            if (entry) {
                setData(entry.data);
                setError(null);
                setLoading(false);
                return;
            }
        }

        let mounted = true;
        setLoading(true);

        fetchShared<T>(url, () => fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
                return res.json() as Promise<T>;
            })
        )
        .then(json => {
            if (!mounted) return;
            setCache(url, json, staleTime);
            setData(json);
            setError(null);
            setLoading(false);
        })
        .catch(err => {
            if (!mounted) return;
            setError(err instanceof Error ? err : new Error(String(err)));
            setLoading(false);
        });

        return () => {
            mounted = false;
        };
    }, [url, staleTime]);

    return { data, error, loading };
}

// ── Infinite Query ────────────────────────────────────

export interface InfiniteQueryOptions<T, P> {
    /** Called with a page param; resolves to one page of data. */
    queryFn: (pageParam: P) => Promise<T>;
    /** Param used for the very first page fetch. */
    initialPageParam: P;
    /**
     * Given the last fetched page and all pages so far, return the param
     * for the next page, or `undefined` to signal no more pages.
     */
    getNextPageParam: (lastPage: T, allPages: T[]) => P | undefined;
}

export interface UseInfiniteQueryResult<T> {
    pages: T[];
    error: Error | null;
    loading: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => void;
}

/**
 * useInfiniteQuery — paged fetch hook.
 *
 * Fetches the first page on mount using `initialPageParam`.
 * Subsequent pages are appended by calling `fetchNextPage()`.
 * `hasNextPage` becomes false when `getNextPageParam` returns `undefined`.
 */
export function useInfiniteQuery<T, P = number>(
    options: InfiniteQueryOptions<T, P>,
): UseInfiniteQueryResult<T> {
    const { queryFn, initialPageParam, getNextPageParam } = options;

    const [pages, setPages] = useState<T[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Per-run AbortController for the initial-page effect.
    // Each effect run creates a fresh controller and aborts the previous one on
    // cleanup, so stale promise callbacks see `signal.aborted === true` and bail.
    const abortControllerRef = useRef<AbortController | null>(null);

    // Generation counter for fetchNextPage: incremented when the main effect
    // re-runs (queryFn / initialPageParam changed), so any in-flight
    // fetchNextPage response belonging to the old generation is discarded.
    const generationRef = useRef(0);

    // Guard against rapid double-clicks or fast-scrolling triggering duplicate fetches.
    const loadingRef = useRef(false);

    // Fetch the first page on mount (re-runs if queryFn / initialPageParam change).
    useEffect(() => {
        // Abort any previous in-flight fetch from the last effect run.
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Invalidate any in-flight fetchNextPage from the old generation.
        generationRef.current += 1;

        setLoading(true);
        loadingRef.current = true;

        queryFn(initialPageParam)
            .then(page => {
                if (controller.signal.aborted) return;
                setPages([page]);
                setError(null);
                setLoading(false);
                loadingRef.current = false;
            })
            .catch(err => {
                if (controller.signal.aborted) return;
                setError(err instanceof Error ? err : new Error(String(err)));
                setLoading(false);
                loadingRef.current = false;
            });

        return () => {
            generationRef.current += 1;
            controller.abort();
        };
    }, [queryFn, initialPageParam]);

    // Derive next param and hasNextPage from current pages snapshot.
    const nextParam = pages.length > 0
        ? getNextPageParam(pages[pages.length - 1], pages)
        : undefined;

    const hasNextPage = nextParam !== undefined;

    const fetchNextPage = useCallback(() => {
        // No-op while a fetch is in flight or when there is no next page.
        if (loadingRef.current || nextParam === undefined) return;

        loadingRef.current = true;

        // Capture the current generation; if the main effect re-runs before
        // this promise settles, the generation will have changed and we skip.
        const myGeneration = generationRef.current;

        setLoading(true);
        queryFn(nextParam)
            .then(page => {
                if (myGeneration !== generationRef.current) return;
                loadingRef.current = false;
                setPages(prev => [...prev, page]);
                setError(null);
                setLoading(false);
            })
            .catch(err => {
                if (myGeneration !== generationRef.current) return;
                loadingRef.current = false;
                setError(err instanceof Error ? err : new Error(String(err)));
                setLoading(false);
            });
    }, [nextParam, queryFn]);

    return { pages, error, loading, hasNextPage, fetchNextPage };
}
