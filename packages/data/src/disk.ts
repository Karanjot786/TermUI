// ─────────────────────────────────────────────────────
// @termuijs/data — Disk usage via shell commands
// ─────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';

export interface DiskPartition {
    filesystem: string;
    size: string;
    used: string;
    available: string;
    percent: number;
    mountpoint: string;
}

let _cachedPartitions: DiskPartition[] = [];
let _lastDiskCheck = 0;
const DISK_CACHE_MS = 5000; // refresh every 5s

function parseDf(): DiskPartition[] {
    try {
        const output = execFileSync('df', ['-h'], { encoding: 'utf-8', timeout: 3000 });
        const lines = output.trim().split('\n');
        if (lines.length < 2) return [];

        return lines.slice(1) // skip header
            .map(line => {
                const parts = line.split(/\s+/);
                if (parts.length < 6) return null;

                // macOS: Filesystem Size Used Avail Capacity iused ifree %iused Mounted on
                // Linux:  Filesystem Size Used Avail Use%   Mounted on
                const percentIdx = 4;
                const percentStr = parts[percentIdx]?.replace('%', '');
                // Mountpoint is always the last field
                const mountpoint = parts[parts.length - 1];

                return {
                    filesystem: parts[0],
                    size: parts[1],
                    used: parts[2],
                    available: parts[3],
                    percent: parseInt(percentStr, 10) || 0,
                    mountpoint,
                };
            })
            .filter((p): p is DiskPartition => p !== null && !p.filesystem.startsWith('devfs'));
    } catch {
        return [];
    }
}

function getPartitions(): DiskPartition[] {
    const now = Date.now();
    if (now - _lastDiskCheck > DISK_CACHE_MS || _cachedPartitions.length === 0) {
        _cachedPartitions = parseDf();
        _lastDiskCheck = now;
    }
    return _cachedPartitions;
}

/** Disk data provider */
export const disk = {
    /** Main disk (/) usage percentage 0–100 */
    get percent(): number {
        const root = getPartitions().find(p => p.mountpoint === '/');
        return root?.percent ?? 0;
    },

    /** All mounted partitions */
    get partitions(): DiskPartition[] {
        return getPartitions();
    },

    /** Main disk info: { size, used, available, percent } */
    get main(): DiskPartition | null {
        return getPartitions().find(p => p.mountpoint === '/') ?? null;
    },
};
