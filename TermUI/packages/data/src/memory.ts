// ─────────────────────────────────────────────────────
// @termuijs/data — Memory metrics via Node.js os module
// ─────────────────────────────────────────────────────

import * as os from 'node:os';

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(1)} ${units[i]}`;
}

/** Memory data provider */
export const memory = {
    /** Memory usage percentage 0–100 */
    get percent(): number {
        const total = os.totalmem();
        const free = os.freemem();
        return Math.round(((total - free) / total) * 100);
    },

    /** Used memory (human-readable) */
    get used(): string {
        return formatBytes(os.totalmem() - os.freemem());
    },

    /** Free memory (human-readable) */
    get free(): string {
        return formatBytes(os.freemem());
    },

    /** Total memory (human-readable) */
    get total(): string {
        return formatBytes(os.totalmem());
    },

    /** Raw bytes: { used, free, total } */
    get raw(): { used: number; free: number; total: number } {
        const total = os.totalmem();
        const free = os.freemem();
        return { used: total - free, free, total };
    },
};
