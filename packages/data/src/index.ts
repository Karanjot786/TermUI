// ─────────────────────────────────────────────────────
// @termuijs/data — Public API
// ─────────────────────────────────────────────────────

export { cpu } from './cpu.js';
export { memory } from './memory.js';
export { disk } from './disk.js';
export type { DiskPartition } from './disk.js';
export { processes } from './processes.js';
export type { ProcessInfo } from './processes.js';
export { network } from './network.js';
export type { NetworkInterface } from './network.js';
export { system } from './system.js';
export { tail } from './tail.js';
export type { TailOptions, TailStream } from './tail.js';
export { http } from './http.js';
export type { HealthResult, Endpoint } from './http.js';
export { invalidate } from './cache.js';


// ── Reactive hooks ────────────────────────────────────
export {
    useCpu,
    useMemory,
    useDisk,
    useNetwork,
    useTopProcesses,
    useSystemInfo,
    useHttpHealth,
    useWebSocket,
    useFetch,
} from './hooks.js';
export type {
    CpuMetrics,
    MemoryMetrics,
    DiskMetrics,
    NetworkMetrics,
    SystemInfo,
    UseWebSocketReturn,
    WebSocketState,
    UseFetchOptions,
    UseFetchResult,
} from './hooks.js';
