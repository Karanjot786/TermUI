import { useState, useEffect } from '@termuijs/jsx';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as os from 'node:os';

const execFileAsync = (file: string, args: string[], opts?: any): Promise<{ stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
        execFile(file, args, opts, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve({ stdout: String(stdout), stderr: String(stderr) });
        });
    });
};

export interface BatteryData {
    level: number;
    charging: boolean;
}

export interface UseBatteryResult {
    data: BatteryData | null;
    error: Error | null;
    loading: boolean;
}

/**
 * useBattery — reactive hook for battery status, updated every `intervalMs` milliseconds.
 */
export function useBattery(intervalMs = 10000): UseBatteryResult {
    const [data, setData] = useState<BatteryData | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;
        let timer: ReturnType<typeof setInterval> | null = null;

        const update = async () => {
            try {
                const platform = os.platform();
                let level = 100;
                let charging = false;

                if (platform === 'darwin') {
                    const { stdout } = await execFileAsync('pmset', ['-g', 'batt'], { timeout: 2000 });
                    const levelMatch = stdout.match(/(\d+)%/);
                    if (!levelMatch) throw new Error('Could not parse battery level');
                    charging = stdout.includes('charging') || stdout.includes('AC Power');
                    level = parseInt(levelMatch[1], 10);
                } else if (platform === 'linux') {
                    try {
                        const capacity = readFileSync('/sys/class/power_supply/BAT0/capacity', 'utf-8');
                        const status = readFileSync('/sys/class/power_supply/BAT0/status', 'utf-8');
                        level = parseInt(capacity.trim(), 10);
                        charging = status.trim().toLowerCase() === 'charging';
                    } catch {
                        const capacity = readFileSync('/sys/class/power_supply/BAT1/capacity', 'utf-8');
                        const status = readFileSync('/sys/class/power_supply/BAT1/status', 'utf-8');
                        level = parseInt(capacity.trim(), 10);
                        charging = status.trim().toLowerCase() === 'charging';
                    }
                } else if (platform === 'win32') {
                    const { stdout } = await execFileAsync('wmic', ['path', 'Win32_Battery', 'get', 'EstimatedChargeRemaining, BatteryStatus'], { timeout: 2000 });
                    const lines = stdout.trim().split('\n').map(l => l.trim()).filter(l => l);
                    if (lines.length < 2) throw new Error('Could not parse Windows battery');
                    const parts = lines[1].split(/\s+/);
                    const batteryStatus = parseInt(parts[0], 10);
                    level = parseInt(parts[1], 10);
                    charging = batteryStatus === 2;
                } else {
                    throw new Error(`Battery information not supported on platform: ${platform}`);
                }

                if (isMounted) {
                    setData({ level, charging });
                    setError(null);
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setLoading(false);
                }
            }
        };

        update();
        timer = setInterval(update, intervalMs);

        return () => {
            isMounted = false;
            if (timer !== null) {
                clearInterval(timer);
            }
        };
    }, [intervalMs]);

    return { data, error, loading };
}
