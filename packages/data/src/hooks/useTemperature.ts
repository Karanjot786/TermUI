import { useState, useEffect } from '@termuijs/jsx';
import { readFile } from 'node:fs/promises';
import * as os from 'node:os';
import { execFileAsync } from './_exec.js';

export interface TemperatureData {
    celsius: number;
    platform: string;
}

export interface UseTemperatureResult {
    data: TemperatureData | null;
    error: Error | null;
    loading: boolean;
}

export function useTemperature(intervalMs = 5000): UseTemperatureResult {
    const [data, setData] = useState<TemperatureData | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;
        let timer: ReturnType<typeof setInterval> | null = null;

        const update = async () => {
            try {
                const platform = os.platform();
                let celsius = 0;

                if (platform === 'linux') {
                    const content = await readFile('/sys/class/thermal/thermal_zone0/temp', 'utf8');
                    celsius = parseInt(content.trim(), 10) / 1000;
                } else if (platform === 'darwin') {
                    throw new Error('Temperature reading is not supported on macOS');
                } else if (platform === 'win32') {
                    const { stdout } = await execFileAsync(
                        'wmic',
                        ['/namespace:\\\\root\\wmi', 'PATH', 'MSAcpi_ThermalZoneTemperature', 'get', 'CurrentTemperature'],
                        { timeout: 2000 },
                    );
                    const lines = stdout.trim().split('\n').map(l => l.trim()).filter(l => l && !l.includes('CurrentTemperature'));
                    if (lines.length > 0) {
                        const tempTenthsKelvin = parseInt(lines[lines.length - 1], 10);
                        if (!isNaN(tempTenthsKelvin)) {
                            celsius = (tempTenthsKelvin / 10) - 273.15;
                        } else {
                            throw new Error('Could not parse Windows temperature');
                        }
                    } else {
                        throw new Error('No temperature data available');
                    }
                } else {
                    throw new Error(`Temperature not supported on platform: ${platform}`);
                }

                if (isMounted) {
                    setData({ celsius, platform });
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
