// ─────────────────────────────────────────────────────
// @termuijs/data — Docker container monitoring
// ─────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';

export interface DockerContainer {
    id: string;
    name: string;
    image: string;
    status: string;
    state: string;
    cpu: number;
    memPercent: number;
    memUsed: number;
    memLimit: number;
    netRx: number;
    netTx: number;
    pids: number;
}


function parseBytes(value: string): number {
    const trimmed = value.trim();
    const match = trimmed.match(/^([\d.]+)\s*([kKMGTPE]i?B|B)$/);
    if (!match) return 0;
    const num = parseFloat(match[1]) || 0;
    const unit = match[2];
    const units: Record<string, number> = {
        B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3,
        TiB: 1024 ** 4, kB: 1000, KB: 1000, MB: 1000 ** 2, GB: 1000 ** 3,
    };
    return Math.round(num * (units[unit] ?? 1));
}

function parsePerc(value: string): number {
    return parseFloat(value.replace('%', '')) || 0;
}

function parseNetIO(value: string): { rx: number; tx: number } {
    // Docker format: "1.02kB / 512B" or "0B / 0B"
    const parts = value.split('/').map(s => s.trim());
    return {
        rx: parseBytes(parts[0] ?? '0B'),
        tx: parseBytes(parts[1] ?? '0B'),
    };
}

interface DockerPsRow {
    ID: string;
    Names: string;
    Image: string;
    Status: string;
    State: string;
    Ports: string;
    CreatedAt: string;
    RunningFor: string;
}

interface DockerStatsRow {
    CPU?: string;
    CPUPerc?: string;
    MemUsage: string;
    MemPerc: string;
    NetIO: string;
    BlockIO: string;
    PIDs: string;
    Name: string;
    ID: string;
    Container: string;
}

function runDockerPs(): DockerContainer[] {
    try {
        const output = execFileSync('docker', [
            'ps', '--all', '--no-trunc',
            '--format', '{{json .}}',
        ], { encoding: 'utf-8', timeout: 5000 });

        const lines = output.trim().split('\n').filter(Boolean);
        return lines.map(line => {
            try {
                const raw: DockerPsRow = JSON.parse(line);
                const state = (raw.State ?? '').toLowerCase();
                const running = state === 'running';

                return {
                    id: raw.ID.slice(0, 12),
                    name: raw.Names?.replace(/^\//, '') ?? 'unknown',
                    image: raw.Image ?? 'unknown',
                    status: raw.Status ?? 'unknown',
                    state,
                    cpu: 0,
                    memPercent: 0,
                    memUsed: 0,
                    memLimit: 0,
                    netRx: 0,
                    netTx: 0,
                    pids: running ? 1 : 0,
                };
            } catch {
                return null;
            }
        }).filter((c): c is DockerContainer => c !== null);
    } catch {
        return [];
    }
}

function enrichWithStats(containers: DockerContainer[]): DockerContainer[] {
    if (containers.length === 0) return containers;

    const running = containers.filter(c => c.state === 'running');
    if (running.length === 0) return containers;

    try {
        const output = execFileSync('docker', [
            'stats', '--no-stream', '--no-trunc',
            '--format', '{{json .}}',
            ...running.map(c => c.id),
        ], { encoding: 'utf-8', timeout: 10000 });

        const lines = output.trim().split('\n').filter(Boolean);
        const statsMap = new Map<string, DockerStatsRow>();

        for (const line of lines) {
            try {
                const stat: DockerStatsRow = JSON.parse(line);
                // Match by short container ID (12 chars) from the Container field
                statsMap.set(stat.Container, stat);
            } catch {
                // skip malformed lines
            }
        }

        return containers.map(c => {
            const stat = statsMap.get(c.id);
            if (!stat) return c;

            const cpu = stat.CPUPerc ? parsePerc(stat.CPUPerc) : 0;
            const memPerc = parsePerc(stat.MemPerc);
            const memParts = stat.MemUsage.split('/').map(s => s.trim());
            const memUsed = parseBytes(memParts[0] ?? '0B');
            const memLimit = parseBytes(memParts[1] ?? '0B');
            const net = parseNetIO(stat.NetIO);
            const pids = parseInt(stat.PIDs, 10) || 0;

            return { ...c, cpu, memPercent: memPerc, memUsed, memLimit, netRx: net.rx, netTx: net.tx, pids };
        });
    } catch {
        return containers;
    }
}

/** Docker container monitoring data provider */
export const docker = {
    /**
     * List all containers with basic info.
     * Enriches running containers with live CPU/mem/net stats.
     */
    list(): DockerContainer[] {
        const containers = runDockerPs();
        return enrichWithStats(containers);
    },

};
