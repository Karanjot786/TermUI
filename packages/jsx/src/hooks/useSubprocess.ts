import { spawn } from 'node:child_process';
import { getCurrentApp } from '../runtime.js';

export interface UseSubprocessResult {
    run: (cmd: string[]) => Promise<number>;
}

function spawnProcess(cmd: string[]): Promise<number> {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd[0], cmd.slice(1), {
            stdio: 'inherit',
        });

        proc.on('close', (code: number | null) => {
            resolve(code ?? 0);
        });

        proc.on('error', reject);
    });
}

export function useSubprocess(): UseSubprocessResult {
    async function run(cmd: string[]): Promise<number> {
        if (cmd.length === 0) {
            throw new Error('useSubprocess.run requires a command');
        }

        const app = getCurrentApp();

        app?.terminal.exitRawMode();

        try {
            return await spawnProcess(cmd);
        } finally {
            app?.terminal.enterRawMode();
            app?.screen.invalidate();
            app?.requestRender();
        }
    }

    return { run };
}