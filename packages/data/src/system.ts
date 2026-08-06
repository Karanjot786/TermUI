// ─────────────────────────────────────────────────────
// @termuijs/data — System information helpers
// ─────────────────────────────────────────────────────

import * as os from 'node:os';

/**
 * Format system uptime duration in seconds into a human-readable string.
 * @param seconds - System uptime duration in seconds.
 * @returns Formatted human-readable uptime string (e.g. "2d 4h", "3h 15m", or "45m").
 */
function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

/** System info provider */
export const system = {
    /** OS platform (darwin, linux, win32) */
    get platform(): string {
        return os.platform();
    },

    /** OS release version */
    get release(): string {
        return os.release();
    },

    /** OS type (Darwin, Linux, Windows_NT) */
    get type(): string {
        return os.type();
    },

    /** System hostname */
    get hostname(): string {
        return os.hostname();
    },

    /** System uptime (human-readable) */
    get uptime(): string {
        return formatUptime(os.uptime());
    },

    /** System uptime in seconds */
    get uptimeSeconds(): number {
        return os.uptime();
    },

    /** Current user info */
    get user(): string {
        try {
            return os.userInfo().username;
        } catch {
            return 'unknown';
        }
    },

    /** Architecture (x64, arm64, etc.) */
    get arch(): string {
        return os.arch();
    },

    /** Node.js version */
    get nodeVersion(): string {
        return process.version;
    },
};
