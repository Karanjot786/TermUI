// ─────────────────────────────────────────────────────
// @termuijs/data — CPU metrics via Node.js os module
// ─────────────────────────────────────────────────────

import * as os from 'node:os';

interface CpuTimes {
    user: number;
    nice: number;
    sys: number;
    idle: number;
    irq: number;
}

let _prevCpus: os.CpuInfo[] | null = null;
let _cachedDelta: { percent: number; perCore: number[] } | null = null;
let _lastDeltaTime = 0;
const CPU_CACHE_MS = 200; // Share same sample within a render cycle

function getCpuDelta(): { percent: number; perCore: number[] } {
    const cpus = os.cpus();

    if (!_prevCpus || _prevCpus.length !== cpus.length) {
        _prevCpus = cpus;
        return { percent: 0, perCore: cpus.map(() => 0) };
    }

    let totalIdle = 0;
    let totalTick = 0;
    const perCore: number[] = [];

    for (let i = 0; i < cpus.length; i++) {
        const prev = _prevCpus[i].times;
        const curr = cpus[i].times;

        const idleDelta = curr.idle - prev.idle;
        const totalDelta =
            (curr.user - prev.user) +
            (curr.nice - prev.nice) +
            (curr.sys - prev.sys) +
            (curr.idle - prev.idle) +
            (curr.irq - prev.irq);

        totalIdle += idleDelta;
        totalTick += totalDelta;
        perCore.push(totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 100) : 0);
    }

    _prevCpus = cpus;

    const percent = totalTick > 0 ? Math.round((1 - totalIdle / totalTick) * 100) : 0;
    return { percent, perCore };
}

/** Get cached CPU delta (prevents double-call giving inconsistent readings) */
function getCachedCpuDelta(): { percent: number; perCore: number[] } {
    const now = Date.now();
    if (!_cachedDelta || now - _lastDeltaTime > CPU_CACHE_MS) {
        _cachedDelta = getCpuDelta();
        _lastDeltaTime = now;
    }
    return _cachedDelta;
}

/** CPU data provider — all values reactive (call to sample) */
export const cpu = {
    /** Overall CPU usage 0–100 */
    get percent(): number {
        return getCachedCpuDelta().percent;
    },

    /** Per-core CPU usage array (0–100 each) */
    get perCore(): number[] {
        return getCachedCpuDelta().perCore;
    },

    /** Load averages [1min, 5min, 15min] */
    get loadAvg(): number[] {
        return os.loadavg().map(v => Math.round(v * 100) / 100);
    },

    /** CPU model string */
    get model(): string {
        const cpus = os.cpus();
        return cpus.length > 0 ? cpus[0].model : 'Unknown';
    },

    /** Number of CPU cores */
    get count(): number {
        return os.cpus().length;
    },

    /** CPU speed in MHz */
    get speed(): number {
        const cpus = os.cpus();
        return cpus.length > 0 ? cpus[0].speed : 0;
    },
};
