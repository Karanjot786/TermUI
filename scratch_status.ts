import { execFileSync } from 'node:child_process';
try {
    const output = execFileSync('tasklist', [], { encoding: 'utf-8' });
    const lines = output.trim().split('\n');
    console.log('Total processes:', lines.length - 3);
} catch (e) {
    console.error(e);
}
