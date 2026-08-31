import { execFile } from 'node:child_process';

export const execFileAsync = (file: string, args: string[], opts?: any): Promise<{ stdout: string; stderr: string }> => {
    if (!file || typeof file !== 'string') {
        return Promise.reject(new TypeError('execFileAsync: file path must be a non-empty string'));
    }
    if (file.includes('\0')) {
        return Promise.reject(new Error('execFileAsync: file path contains null bytes'));
    }
    if (Array.isArray(args)) {
        for (const arg of args) {
            if (typeof arg === 'string' && arg.includes('\0')) {
                return Promise.reject(new Error('execFileAsync: argument contains null bytes'));
            }
        }
    }
    return new Promise((resolve, reject) => {
        execFile(file, args, { ...opts, shell: false }, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve({ stdout: String(stdout), stderr: String(stderr) });
        });
    });
};
