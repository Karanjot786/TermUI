import { useState, useEffect } from '@termuijs/jsx';
import { exec, type ExecOptions } from 'node:child_process';
import * as os from 'node:os';

const execAsync = (cmd: string, opts?: ExecOptions): Promise<{ stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
        exec(cmd, opts, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve({ stdout: String(stdout), stderr: String(stderr) });
        });
    });
};

export interface GpuData {
    utilizationPercent: number;
    vramUsedMb: number | null;
    vramTotalMb: number | null;
}

export interface UseGpuResult {
    data: GpuData | null;
    error: Error | null;
    loading: boolean;
}

async function fetchNvidiaGpu(): Promise<GpuData> {
    const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits',
        { timeout: 5000 },
    );
    const line = stdout.trim().split('\n')[0];
    if (!line) {
        throw new Error('No GPU data from nvidia-smi');
    }
    const parts = line.split(',').map(part => part.trim());
    const utilizationPercent = parseInt(parts[0] ?? '', 10);
    if (Number.isNaN(utilizationPercent)) {
        throw new Error('Could not parse GPU utilization');
    }
    const vramUsedMb = parseOptionalInt(parts[1]);
    const vramTotalMb = parseOptionalInt(parts[2]);
    return { utilizationPercent, vramUsedMb, vramTotalMb };
}

function parseOptionalInt(value: string | undefined): number | null {
    if (value === undefined || value === '') return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

async function fetchLinuxAmdGpu(): Promise<GpuData> {
    const { stdout: busy } = await execAsync('cat /sys/class/drm/card0/device/gpu_busy_percent', { timeout: 2000 });
    const utilizationPercent = parseInt(busy.trim(), 10);
    if (Number.isNaN(utilizationPercent)) {
        throw new Error('Could not parse GPU utilization');
    }

    let vramUsedMb: number | null = null;
    let vramTotalMb: number | null = null;
    try {
        const { stdout: used } = await execAsync('cat /sys/class/drm/card0/device/mem_info_vram_used', { timeout: 2000 });
        const { stdout: total } = await execAsync('cat /sys/class/drm/card0/device/mem_info_vram_total', { timeout: 2000 });
        vramUsedMb = Math.round(parseInt(used.trim(), 10) / (1024 * 1024));
        vramTotalMb = Math.round(parseInt(total.trim(), 10) / (1024 * 1024));
        if (Number.isNaN(vramUsedMb)) vramUsedMb = null;
        if (Number.isNaN(vramTotalMb)) vramTotalMb = null;
    } catch {
        // VRAM sysfs nodes are optional on some drivers
    }

    return { utilizationPercent, vramUsedMb, vramTotalMb };
}

async function fetchGpuMetrics(): Promise<GpuData> {
    try {
        return await fetchNvidiaGpu();
    } catch {
        // nvidia-smi unavailable — try platform fallbacks
    }

    if (os.platform() === 'linux') {
        return fetchLinuxAmdGpu();
    }

    throw new Error(`GPU metrics not available on platform: ${os.platform()}`);
}

/**
 * useGpu — reactive GPU utilization and VRAM metrics, updated every `intervalMs` milliseconds.
 *
 * Uses `nvidia-smi` when available; on Linux falls back to AMDGPU sysfs when present.
 * VRAM fields are `null` when the platform does not expose memory usage.
 */
export function useGpu(intervalMs = 5000): UseGpuResult {
    const [data, setData] = useState<GpuData | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;
        let timer: ReturnType<typeof setInterval> | null = null;

        const update = async () => {
            try {
                const metrics = await fetchGpuMetrics();
                if (isMounted) {
                    setData(metrics);
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
