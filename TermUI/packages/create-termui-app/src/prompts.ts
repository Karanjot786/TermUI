// ─────────────────────────────────────────────────────
// Minimal interactive prompts (no external deps)
// ─────────────────────────────────────────────────────

import { createInterface } from 'node:readline';

const rl = () => createInterface({ input: process.stdin, output: process.stdout });

export async function textPrompt(question: string, defaultValue?: string): Promise<string> {
    return new Promise(resolve => {
        const r = rl();
        const suffix = defaultValue ? ` (${defaultValue})` : '';
        r.question(`  ${question}${suffix}: `, answer => {
            r.close();
            resolve(answer.trim() || defaultValue || '');
        });
    });
}

export async function selectPrompt(question: string, options: string[]): Promise<number> {
    console.log(`\n  ${question}`);
    for (let i = 0; i < options.length; i++) {
        console.log(`    ${i + 1}) ${options[i]}`);
    }
    const answer = await textPrompt('Enter number', '1');
    const idx = parseInt(answer) - 1;
    return Math.max(0, Math.min(idx, options.length - 1));
}

export async function confirmPrompt(question: string, defaultValue = true): Promise<boolean> {
    const suffix = defaultValue ? '(Y/n)' : '(y/N)';
    const answer = await textPrompt(`${question} ${suffix}`);
    if (!answer) return defaultValue;
    return answer.toLowerCase().startsWith('y');
}

export async function multiSelectPrompt(question: string, options: string[], defaults: boolean[] = []): Promise<boolean[]> {
    console.log(`\n  ${question} (comma-separated numbers, or 'all')`);
    for (let i = 0; i < options.length; i++) {
        const def = defaults[i] ? '✓' : ' ';
        console.log(`    ${i + 1}) [${def}] ${options[i]}`);
    }
    const answer = await textPrompt('Enter numbers', defaults.some(d => d) ? 'keep defaults' : 'all');
    if (answer === 'all') return options.map(() => true);
    if (answer === 'keep defaults' || answer === '') return defaults.length ? defaults : options.map(() => true);
    const selected = answer.split(',').map(s => parseInt(s.trim()) - 1);
    return options.map((_, i) => selected.includes(i));
}
