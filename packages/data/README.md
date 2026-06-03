# @termuijs/data

Real-time system metrics for TermUI. CPU, memory, disk, network, processes, and HTTP health; available as raw function calls or as reactive hooks for JSX components.

## Install

```bash
npm install @termuijs/data
```

## Raw API

Call these functions directly for one-shot reads:

```typescript
import { cpu, memory, disk, network, processes, system } from '@termuijs/data'

// CPU
console.log(cpu.percent)    // 45.2
console.log(cpu.cores)      // 8

// Memory
console.log(memory.used)    // bytes
console.log(memory.total)   // bytes
console.log(memory.percent) // 67.1

// Disk
console.log(disk.percent)   // 52.3

// Top processes by CPU
const top = processes.top(5)
// [{ name: 'node', pid: 1234, cpu: 12.3, mem: 5.6 }, ...]

// Network throughput
console.log(network.rx)  // bytes/sec received
console.log(network.tx)  // bytes/sec transmitted

// System info (static)
console.log(system.hostname)
console.log(system.platform)
console.log(system.uptime)
```

## Reactive hooks

Use these inside JSX components. Each hook polls on an interval and triggers a re-render when data changes. All hooks clean up their intervals on component unmount.

```typescript
import {
    useCpu,
    useMemory,
    useDisk,
    useNetwork,
    useTopProcesses,
    useSystemInfo,
    useHttpHealth,
} from '@termuijs/data'

function CpuMonitor() {
    const cpu = useCpu(500)  // refresh every 500ms
    return <gauge label="CPU" value={cpu.usage / 100} />
}

function SystemDashboard() {
    const cpu  = useCpu(1000)
    const mem  = useMemory(1000)
    const disk = useDisk(5000)
    const top  = useTopProcesses(5, 2000)
    const info = useSystemInfo()  // fetched once; static

    return (
        <Box flexDirection="column">
            <Text>Host: {info.hostname}</Text>
            <Text>CPU: {cpu.usage.toFixed(1)}%</Text>
            <Text>MEM: {(mem.used / mem.total * 100).toFixed(1)}%</Text>
        </Box>
    )
}
```

## HTTP health checks

```typescript
import { useHttpHealth } from '@termuijs/data'

function HealthPanel() {
    const checks = useHttpHealth(
        ['https://api.example.com/health', 'https://db.example.com/ping'],
        5000,  // check every 5 seconds
    )

    return (
        <Box flexDirection="column">
            {checks.map((c) => (
                <Text key={c.url} color={c.status === 200 ? 'green' : 'red'}>
                    {c.url}: {c.status} ({c.latencyMs}ms)
                </Text>
            ))}
        </Box>
    )
}
```

## Hook reference

| Hook | Default interval | Returns |
|------|-----------------|---------|
| `useCpu(ms?)` | 1000ms | `{ usage, cores, model }` |
| `useMemory(ms?)` | 1000ms | `{ used, total, free, percent }` |
| `useDisk(ms?)` | 5000ms | `{ used, total, free, percent }` |
| `useNetwork(ms?)` | 1000ms | `{ rx, tx, interface }` |
| `useTopProcesses(n, ms?)` | 2000ms | `Array<{ name, pid, cpu, mem }>` |
| `useSystemInfo()` | once | `{ hostname, platform, arch, uptime }` |
| `useHttpHealth(urls, ms?)` | 5000ms | `Array<{ url, status, latencyMs }>` |

## Raw collectors vs hooks

Raw collectors (`cpu.percent`, `memory.used`, etc.) do not clean up. Use them in one-shot scripts or outside component trees. Use hooks inside JSX components; they register cleanup on unmount automatically.

## Documentation

Full docs at [www.termui.io/docs/data/overview](https://www.termui.io/docs/data/overview).

## License

MIT

---

## Data fetching guide

`@termuijs/data` includes reactive hooks for fetching remote data inside
TermUI components. Each hook integrates with the TermUI render loop — updates
trigger re-renders automatically. No manual subscription management is needed.

### Overview

The data-fetching hooks follow the same reactive model as the system-metric
hooks (`useCpu`, `useMemory`, etc.) already in this package. Each hook returns
a plain object whose fields update when new data arrives, and the component
re-renders only when the values it reads change.

Four primitives cover the most common patterns:

| Hook | Use case |
| --- | --- |
| `useFetch` | One-shot HTTP request on mount, with optional caching |
| `usePolling` | Repeated HTTP requests at a fixed interval |
| `useSSE` | Streaming updates over a Server-Sent Events connection |
| `invalidate` | Drop a cached response to force the next `useFetch` to re-fetch |

---

### useFetch

`useFetch` fires an HTTP request when the component mounts and exposes the
result reactively. Responses are cached by URL for the duration of `ttl`.

```typescript
import { useFetch } from '@termuijs/data'
import type { UseFetchOptions, UseFetchResult } from '@termuijs/data'

function PriceWidget() {
    const options: UseFetchOptions<{ price: number }> = {
        url: 'https://api.example.com/price',
        ttl: 30_000, // cache for 30 seconds
    }

    const result: UseFetchResult<{ price: number }> = useFetch(options)

    if (result.loading) return <Text>Loading…</Text>
    if (result.error)   return <Text color="red">{result.error.message}</Text>

    return <Text>Price: {result.data?.price}</Text>
}
```

`UseFetchOptions<T>` accepts at minimum a `url` string. Common fields:

| Field | Type | Description |
| --- | --- | --- |
| `url` | `string` | Endpoint to request |
| `method` | `string` | HTTP method (default `"GET"`) |
| `headers` | `Record<string, string>` | Extra request headers |
| `body` | `unknown` | Request body (JSON-serialised) |
| `ttl` | `number` | Cache lifetime in milliseconds |

`UseFetchResult<T>` fields:

| Field | Type | Description |
| --- | --- | --- |
| `data` | `T \| undefined` | Parsed response body |
| `loading` | `boolean` | `true` while the request is in flight |
| `error` | `Error \| undefined` | Set if the request failed |
| `refetch` | `() => void` | Manually re-run the request |

---

### Polling

`usePolling` re-fetches a URL at a fixed millisecond interval. Use it for
dashboards that need periodic refresh without a persistent connection.

```typescript
import { usePolling } from '@termuijs/data'
import type { UsePollingResult } from '@termuijs/data'

function StockTicker() {
    // refresh every 5 seconds
    const result: UsePollingResult<{ symbol: string; bid: number }[]> =
        usePolling('https://api.example.com/quotes', 5_000)

    if (result.loading && !result.data) return <Text>Connecting…</Text>

    return (
        <Box flexDirection="column">
            {result.data?.map((q) => (
                <Text key={q.symbol}>{q.symbol}: {q.bid}</Text>
            ))}
            {result.error && <Text color="red">{result.error.message}</Text>}
        </Box>
    )
}
```

`UsePollingResult<T>` fields:

| Field | Type | Description |
| --- | --- | --- |
| `data` | `T \| undefined` | Last successful response |
| `loading` | `boolean` | `true` only on the very first request |
| `error` | `Error \| undefined` | Last error; polling continues regardless |

After the first successful response `loading` stays `false`, so the UI keeps
showing stale data while the next request is in flight.

---

### SSE

`useSSE` opens a persistent Server-Sent Events connection and pushes each
received event into `data`. The connection closes automatically when the
component unmounts.

```typescript
import { useSSE } from '@termuijs/data'
import type { UseSSEResult } from '@termuijs/data'

interface LogLine {
    ts: number
    level: string
    msg: string
}

function LiveLog() {
    const result: UseSSEResult<LogLine> =
        useSSE('https://api.example.com/logs/stream')

    return (
        <Box flexDirection="column">
            {result.connected
                ? <Text dim>Connected</Text>
                : <Text color="yellow">Reconnecting…</Text>}
            {result.data && (
                <Text>[{result.data.level}] {result.data.msg}</Text>
            )}
            {result.error && (
                <Text color="red">{result.error.message}</Text>
            )}
        </Box>
    )
}
```

`UseSSEResult<T>` fields:

| Field | Type | Description |
| --- | --- | --- |
| `data` | `T \| undefined` | Most recent parsed event payload |
| `connected` | `boolean` | `true` when the connection is open |
| `error` | `Error \| undefined` | Set if the connection failed |

---

### Caching

`useFetch` caches responses in memory, keyed by URL. Cached entries are reused
until their `ttl` expires, after which the next render re-fetches
automatically.

To drop a cached entry early — for example, after a write — call `invalidate`:

```typescript
import { useFetch, invalidate } from '@termuijs/data'

function TodoList() {
    const todos = useFetch({ url: '/api/todos', ttl: 60_000 })

    async function addTodo(title: string) {
        await fetch('/api/todos', {
            method: 'POST',
            body: JSON.stringify({ title }),
        })
        // drop the cached list so the next render re-fetches
        invalidate('/api/todos')
    }

    // …
}
```

`invalidate(url: string): void` removes the cache entry for the given URL. Any
mounted component using that URL will re-fetch in the background immediately.
Calling `invalidate` with a URL that has no cached entry is a no-op.
