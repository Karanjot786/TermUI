import { useState, useEffect } from '../hooks.js';
import { getCurrentApp } from '../runtime.js';

export interface TerminalSize {
    cols: number;
    rows: number;
}

export function useTerminalSize(): TerminalSize {
    const app = getCurrentApp();

    const [size, setSize] = useState<TerminalSize>({
        cols: app?.terminal?.cols ?? 0,
        rows: app?.terminal?.rows ?? 0,
    });

    useEffect(() => {
        const currentApp = getCurrentApp();

        if (!currentApp) {
            return;
        }

        const handleResize = ({
            cols,
            rows,
        }: {
            cols: number;
            rows: number;
        }) => {
            setSize({ cols, rows });
        };

        const unsubscribe =
            currentApp.events.on('resize', handleResize);

        return () => {
            unsubscribe();
        };
    }, []);

    return size;
}