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
    useInfiniteQuery,
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
    InfiniteQueryOptions,
    UseInfiniteQueryResult,
} from './hooks.js';
export { useBattery } from './hooks/useBattery.js';
export type { BatteryData, UseBatteryResult } from './hooks/useBattery.js';

export { usePolling } from './hooks/usePolling.js';
export type { UsePollingResult } from './hooks/usePolling.js';

export { useMutation } from './hooks/useMutation.js'
export type { HttpMethod, UseMutationReturn } from './hooks/useMutation.js'

export { useSSE } from './hooks/useSSE.js';
export type { UseSSEResult } from './hooks/useSSE.js';

export { useGpu } from './hooks/useGpu.js';
export type { GpuData, UseGpuResult } from './hooks/useGpu.js';

export { useTemperature } from './hooks/useTemperature.js';
export type { TemperatureData, UseTemperatureResult } from './hooks/useTemperature.js';
