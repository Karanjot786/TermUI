import { execFile } from 'node:child_process';

export const execFileAsync = (file: string, args: string[], opts?: any): Promise<{ stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
        execFile(file, args, opts, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve({ stdout: String(stdout), stderr: String(stderr) });
        });
    });
};
