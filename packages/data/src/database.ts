// ─────────────────────────────────────────────────────
// @termuijs/data — Database connection pool monitoring
// ─────────────────────────────────────────────────────

import { connect } from 'node:net';
import { execFileSync } from 'node:child_process';

export interface DatabaseConfig {
    type: 'postgres' | 'mysql';
    host: string;
    port: number;
    database?: string;
    username?: string;
    password?: string;
}

export interface DatabaseHealth {
    connected: boolean;
    latencyMs: number;
    activeConnections: number | null;
    maxConnections: number | null;
    poolPercent: number | null;
}

function tcpPing(host: string, port: number, timeoutMs: number): Promise<number> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const socket = connect(port, host, () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve(latency);
        });
        socket.setTimeout(timeoutMs);
        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timed out'));
        });
        socket.on('error', (err: Error) => {
            socket.destroy();
            reject(err);
        });
    });
}

function getPostgresCliMetrics(config: DatabaseConfig): { activeConnections: number | null; maxConnections: number | null } {
    try {
        const baseArgs = ['-h', config.host, '-p', String(config.port), '-t', '-A'];
        const env: Record<string, string | undefined> = { ...process.env as Record<string, string | undefined> };
        if (config.username) env.PGUSER = config.username;
        if (config.database) env.PGDATABASE = config.database;

        const maxOut = execFileSync('psql', [...baseArgs, '-c', 'SHOW max_connections'], {
            encoding: 'utf-8', timeout: 5000, env,
        });

        const activeOut = execFileSync('psql', [...baseArgs, '-c', "SELECT count(*) FROM pg_stat_activity"], {
            encoding: 'utf-8', timeout: 5000, env,
        });

        const maxConnections = parseInt(maxOut.trim(), 10) || null;
        const activeConnections = parseInt(activeOut.trim(), 10) || null;
        return { activeConnections, maxConnections };
    } catch {
        return { activeConnections: null, maxConnections: null };
    }
}

function getMysqlCliMetrics(config: DatabaseConfig): { activeConnections: number | null; maxConnections: number | null } {
    try {
        const baseArgs = ['-h', config.host, '-P', String(config.port), '--batch', '--skip-column-names'];
        if (config.username) baseArgs.push('-u', config.username);
        if (config.password) baseArgs.push(`-p${config.password}`);

        const maxOut = execFileSync('mysql', [...baseArgs, '-e', "SHOW VARIABLES LIKE 'max_connections'"], {
            encoding: 'utf-8', timeout: 5000,
        });

        const activeOut = execFileSync('mysql', [...baseArgs, '-e', 'SELECT COUNT(*) FROM information_schema.processlist'], {
            encoding: 'utf-8', timeout: 5000,
        });

        const maxConnections = parseInt(maxOut.trim().split('\t')[1] ?? '', 10) || null;
        const activeConnections = parseInt(activeOut.trim(), 10) || null;
        return { activeConnections, maxConnections };
    } catch {
        return { activeConnections: null, maxConnections: null };
    }
}

function tryPgIsReady(config: DatabaseConfig): boolean {
    try {
        execFileSync('pg_isready', ['-h', config.host, '-p', String(config.port)], {
            encoding: 'utf-8', timeout: 5000,
        });
        return true;
    } catch {
        return false;
    }
}

function tryMysqlPing(config: DatabaseConfig): boolean {
    try {
        const args = ['ping', '-h', config.host, '-P', String(config.port)];
        if (config.username) args.push('-u', config.username);
        if (config.password) args.push(`-p${config.password}`);
        execFileSync('mysqladmin', args, { encoding: 'utf-8', timeout: 5000 });
        return true;
    } catch {
        return false;
    }
}

/** Database connection pool data provider */
export const database = {
    /**
     * Ping a database and return health status + pool metrics.
     *
     * First attempts a TCP socket connection to measure latency.
     * Then tries CLI tools (psql/pg_isready for Postgres, mysql/mysqladmin
     * for MySQL) for extended pool metrics. Pool fields are null when
     * the CLI tools are not available or authentication fails.
     */
    async ping(config: DatabaseConfig): Promise<DatabaseHealth> {
        let latencyMs: number;
        let connected: boolean;

        try {
            latencyMs = await tcpPing(config.host, config.port, 5000);
            connected = true;
        } catch {
            return {
                connected: false,
                latencyMs: 0,
                activeConnections: null,
                maxConnections: null,
                poolPercent: null,
            };
        }

        let activeConnections: number | null = null;
        let maxConnections: number | null = null;

        try {
            if (config.type === 'postgres') {
                const pgReady = tryPgIsReady(config);
                if (pgReady) {
                    const metrics = getPostgresCliMetrics(config);
                    activeConnections = metrics.activeConnections;
                    maxConnections = metrics.maxConnections;
                }
            } else {
                const mysqlOk = tryMysqlPing(config);
                if (mysqlOk) {
                    const metrics = getMysqlCliMetrics(config);
                    activeConnections = metrics.activeConnections;
                    maxConnections = metrics.maxConnections;
                }
            }
        } catch {
            // CLI tools not available — pool metrics stay null
        }

        const poolPercent = activeConnections !== null && maxConnections !== null && maxConnections > 0
            ? Math.round((activeConnections / maxConnections) * 100)
            : null;

        return {
            connected,
            latencyMs,
            activeConnections,
            maxConnections,
            poolPercent,
        };
    },
};
