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
export { invalidate, setCacheMaxSize, getCache, setCache, isFresh, clearCache, fetchShared } from './cache.js';


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


export { useFileWatch } from './hooks/useFileWatch.js'
export type { FileWatchData, UseFileWatchResult, UseFileWatchOptions } from './hooks/useFileWatch.js'

export { services } from './services.js';
export type { ServiceInfo } from './services.js';
export { useServiceHealth } from './hooks/useServiceHealth.js';
export type { UseServiceHealthResult } from './hooks/useServiceHealth.js';
export { database } from './database.js';
export type { DatabaseConfig, DatabaseHealth } from './database.js';
export { useDatabaseHealth } from './hooks/useDatabaseHealth.js';
export type { UseDatabaseHealthResult } from './hooks/useDatabaseHealth.js';
export { docker } from './docker.js';
export type { DockerContainer } from './docker.js';
export { useDocker } from './hooks/useDocker.js';
export type { UseDockerResult } from './hooks/useDocker.js';
