// ─────────────────────────────────────────────────────
// @termuijs/data — HTTP health check / ping via fetch
// ─────────────────────────────────────────────────────

export interface HealthResult {
    name: string;
    url: string;
    status: 'up' | 'down';
    latency: number;   // ms
    statusCode: number;
}

export interface Endpoint {
    name: string;
    url: string;
}

const _latencyHistory = new Map<string, number[]>();
const MAX_HISTORY = 100;
const MAX_URLS = 100;

/** HTTP data provider — uses native fetch (Node 18+) */
export const http = {
    /**
     * Ping a URL and return health status + latency.
     * An optional AbortSignal can be passed to cancel the request early.
     */
    async ping(url: string, signal?: AbortSignal): Promise<HealthResult> {
        const start = Date.now();
        try {
            // Combine the caller's signal with a 5-second timeout signal so
            // either source can abort the request.
            const timeoutSignal = AbortSignal.timeout(5000);
            const combinedSignal = signal
                ? AbortSignal.any([signal, timeoutSignal])
                : timeoutSignal;
            const res = await fetch(url, {
                method: 'GET',
                signal: combinedSignal,
            });
            // Consume response body to prevent connection leaks
            await res.text().catch(() => { });
            const latency = Date.now() - start;

            // Store latency history
            if (!_latencyHistory.has(url)) {
                if (_latencyHistory.size >= MAX_URLS) {
                    const oldest = _latencyHistory.keys().next().value;
                    if (oldest !== undefined) _latencyHistory.delete(oldest);
                }
                _latencyHistory.set(url, []);
            }
            const history = _latencyHistory.get(url)!;
            history.push(latency);
            if (history.length > MAX_HISTORY) history.shift();

            return {
                name: url,
                url,
                status: res.ok ? 'up' : 'down',
                latency,
                statusCode: res.status,
            };
        } catch {
            const latency = Date.now() - start;
            return { name: url, url, status: 'down', latency, statusCode: 0 };
        }
    },

    /**
     * Get rolling latency history for a URL (for sparklines).
     */
    latency(url: string): number[] {
        return _latencyHistory.get(url) ?? [];
    },

    /**
     * Check multiple endpoints and return results for a table.
     * An optional AbortSignal can be passed to cancel all in-flight requests.
     */
    async checkAll(endpoints: Endpoint[], signal?: AbortSignal): Promise<HealthResult[]> {
        const results = await Promise.all(
            endpoints.map(async (ep) => {
                const result = await http.ping(ep.url, signal);
                result.name = ep.name;
                return result;
            }),
        );
        return results;
    },
};
