// ─────────────────────────────────────────────────────
// @termuijs/data — Service / process supervisor monitoring
// ─────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';
import * as os from 'node:os';

export interface ServiceInfo {
    name: string;
    active: boolean;
    status: string;
    uptime: string;
    uptimeSeconds: number;
    restarts: number;
    cpu: number;
    mem: number;
    pid: number;
    description: string;
}

function formatUptime(seconds: number): string {
    if (seconds <= 0) return '0s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

interface ParsedSystemdService {
    name: string;
    description: string;
    activeState: string;
    subState: string;
    pid: number;
    nRestarts: number;
    activeEnterTimestamp: number;
}

function parseSystemdShow(output: string, serviceName: string): ParsedSystemdService | null {
    const lines = output.split('\n');
    const props: Record<string, string> = {};
    for (const line of lines) {
        const idx = line.indexOf('=');
        if (idx === -1) continue;
        props[line.slice(0, idx)] = line.slice(idx + 1);
    }

    const activeState = props['ActiveState'] ?? 'unknown';
    const description = props['Description'] ?? serviceName;
    const pid = parseInt(props['MainPID'] ?? '0', 10) || 0;
    const nRestarts = parseInt(props['NRestarts'] ?? '0', 10) || 0;

    // Parse ActiveEnterTimestamp (format: "Mon YYYY-DD-DD HH:MM:SS TZ")
    const timestampStr = props['ActiveEnterTimestamp'] ?? '';
    const activeEnterTimestamp = timestampStr && timestampStr !== 'n/a'
        ? new Date(timestampStr).getTime()
        : 0;

    const subState = props['SubState'] ?? 'unknown';
    return { name: serviceName, description, activeState, subState, pid, nRestarts, activeEnterTimestamp };
}

function getSystemdServices(serviceNames: string[]): ServiceInfo[] {
    const results: ServiceInfo[] = [];
    for (const name of serviceNames) {
        try {
            const output = execFileSync('systemctl', ['show', name], {
                encoding: 'utf-8',
                timeout: 3000,
            });
            const parsed = parseSystemdShow(output, name);
            if (!parsed) continue;

            const active = parsed.activeState === 'active';
            const uptimeSeconds = active && parsed.activeEnterTimestamp > 0
                ? Math.floor((Date.now() - parsed.activeEnterTimestamp) / 1000)
                : 0;

            let cpu = 0;
            let mem = 0;
            if (parsed.pid > 0) {
                try {
                    const psOut = execFileSync('ps', ['-p', String(parsed.pid), '-o', '%cpu,%mem', '--no-headers'], {
                        encoding: 'utf-8',
                        timeout: 2000,
                    });
                    const parts = psOut.trim().split(/\s+/);
                    cpu = parseFloat(parts[0] ?? '0') || 0;
                    mem = parseFloat(parts[1] ?? '0') || 0;
                } catch {
                    // ps failed — cpu/mem stay 0
                }
            }

            results.push({
                name: parsed.name,
                active,
                status: parsed.subState,
                uptime: formatUptime(uptimeSeconds),
                uptimeSeconds,
                restarts: parsed.nRestarts,
                cpu,
                mem,
                pid: parsed.pid,
                description: parsed.description,
            });
        } catch {
            // systemctl not available or service not found — try fallback
        }
    }
    return results;
}

interface Pm2Process {
    name: string;
    pid: number;
    pm2_env?: {
        status: string;
        restart_time: number;
        pm_uptime: number;
    };
    monit?: {
        cpu: number;
        memory: number;
    };
}

function getPm2Services(serviceNames: string[]): ServiceInfo[] {
    try {
        const output = execFileSync('pm2', ['jlist'], {
            encoding: 'utf-8',
            timeout: 5000,
        });
        const allProcesses: Pm2Process[] = JSON.parse(output);
        const nameSet = new Set(serviceNames);
        return allProcesses
            .filter(p => nameSet.has(p.name))
            .map(p => {
                const active = p.pm2_env?.status === 'online';
                const uptimeSeconds = p.pm2_env?.pm_uptime
                    ? Math.floor((Date.now() - p.pm2_env.pm_uptime) / 1000)
                    : 0;
                return {
                    name: p.name,
                    active,
                    status: p.pm2_env?.status ?? 'unknown',
                    uptime: formatUptime(uptimeSeconds),
                    uptimeSeconds,
                    restarts: p.pm2_env?.restart_time ?? 0,
                    cpu: p.monit?.cpu ?? 0,
                    mem: p.monit ? Math.round(p.monit.memory / (1024 * 1024)) : 0,
                    pid: p.pid,
                    description: p.name,
                };
            });
    } catch {
        return [];
    }
}

function getProcessFallback(serviceNames: string[]): ServiceInfo[] {
    try {
        const output = execFileSync('ps', ['aux'], {
            encoding: 'utf-8',
            timeout: 3000,
        });
        const lines = output.trim().split('\n').slice(1);
        const results: ServiceInfo[] = [];

        for (const name of serviceNames) {
            const matchingLines = lines.filter(line => {
                const parts = line.trim().split(/\s+/);
                const procName = parts.slice(10).join(' ').split('/').pop() ?? '';
                return procName.includes(name);
            });

            if (matchingLines.length === 0) {
                results.push({
                    name,
                    active: false,
                    status: 'stopped',
                    uptime: '0s',
                    uptimeSeconds: 0,
                    restarts: 0,
                    cpu: 0,
                    mem: 0,
                    pid: 0,
                    description: name,
                });
                continue;
            }

            // Aggregate CPU and mem across matching processes
            let totalCpu = 0;
            let totalMem = 0;
            const pids: number[] = [];
            for (const line of matchingLines) {
                const parts = line.trim().split(/\s+/);
                totalCpu += parseFloat(parts[2]) || 0;
                totalMem += parseFloat(parts[3]) || 0;
                pids.push(parseInt(parts[1], 10) || 0);
            }

            results.push({
                name,
                active: true,
                status: 'running',
                uptime: '-',
                uptimeSeconds: 0,
                restarts: 0,
                cpu: Math.round(totalCpu * 10) / 10,
                mem: Math.round(totalMem * 10) / 10,
                pid: pids[0] ?? 0,
                description: name,
            });
        }
        return results;
    } catch {
        return [];
    }
}

/** Service / process supervisor data provider */
export const services = {
    /**
     * List service status for the given service names.
     * Tries systemd first, falls back to PM2, then to process name matching.
     */
    list(serviceNames: string[]): ServiceInfo[] {
        if (serviceNames.length === 0) return [];

        // Try systemd on Linux
        if (os.platform() === 'linux') {
            try {
                execFileSync('systemctl', ['--version'], { encoding: 'utf-8', timeout: 1000 });
                const svcs = getSystemdServices(serviceNames);
                if (svcs.length > 0) return svcs;
            } catch {
                // systemctl not available — continue to PM2
            }
        }

        // Try PM2
        const pm2Svcs = getPm2Services(serviceNames);
        const pm2Names = new Set(pm2Svcs.map(s => s.name));
        const missing = serviceNames.filter(n => !pm2Names.has(n));
        const results = [...pm2Svcs];

        // Fall back to process name matching for services PM2 didn't cover
        if (missing.length > 0) {
            results.push(...getProcessFallback(missing));
        }

        return results;
    },
};
