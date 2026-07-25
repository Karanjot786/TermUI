// ─────────────────────────────────────────────────────
// @termuijs/data — Process listing via shell commands
// ─────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';

export interface ProcessInfo {
    pid: number;
    name: string;
    cpu: number;   // percentage
    mem: number;   // percentage
    user: string;
}

interface ProcessSnapshot {
    list: ProcessInfo[];
    count: number;
}

let _cachedProcesses: ProcessSnapshot = { list: [], count: 0 };
let _lastProcessCheck = 0;
const PROCESS_CACHE_MS = 2000;

function parsePs(): ProcessSnapshot {
    try {
        // Linux supports --sort=-%cpu; macOS does not — fall back to -r (sort by CPU)
        let output: string;
        try {
            output = execFileSync('ps', ['aux', '--sort=-%cpu'], { encoding: 'utf-8', timeout: 3000 });
        } catch {
            output = execFileSync('ps', ['aux', '-r'], { encoding: 'utf-8', timeout: 3000 });
        }
        const lines = output.trim().split('\n').slice(1); // skip header

        return {
            list: lines.slice(0, 50).map(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 11) {
                    return { pid: 0, name: 'unknown', cpu: 0, mem: 0, user: '' };
                }
                return {
                    user: parts[0],
                    pid: parseInt(parts[1], 10) || 0,
                    cpu: parseFloat(parts[2]) || 0,
                    mem: parseFloat(parts[3]) || 0,
                    name: parts.slice(10).join(' ').split('/').pop()?.split(' ')[0] ?? parts[10],
                };
            }),
            count: lines.length,
        };
    } catch {
        return { list: [], count: 0 };
    }
}

function getProcesses(): ProcessSnapshot {
    const now = Date.now();
    if (now - _lastProcessCheck > PROCESS_CACHE_MS || _cachedProcesses.list.length === 0) {
        _cachedProcesses = parsePs();
        _lastProcessCheck = now;
    }
    return _cachedProcesses;
}

/** Process data provider */
export const processes = {
    /** Top N processes sorted by CPU usage */
    top(n = 10): ProcessInfo[] {
        return getProcesses().list.slice(0, n);
    },

    /** Full process list (up to 50) */
    get list(): ProcessInfo[] {
        return getProcesses().list;
    },

    /** Total number of running processes */
    get count(): number {
        return getProcesses().count;
    },
};
