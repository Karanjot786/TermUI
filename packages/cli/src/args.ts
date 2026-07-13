export interface CliArgs {
    command: 'add' | 'list' | 'init' | 'help';
    components: string[];
    dir?: string;
    dryRun: boolean;
    yes: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
    const [cmd, ...rest] = argv;
    const command: CliArgs['command'] =
        cmd === 'add' ? 'add' : cmd === 'list' ? 'list' : cmd === 'init' ? 'init' : 'help';

    const components: string[] = [];
    let dir: string | undefined;
    let dryRun = false;
    let yes = false;

    for (let i = 0; i < rest.length; i++) {
        const a = rest[i]!;
        if (a === '--dir') {
            const value = rest[++i];
            if (!value || value.startsWith('-')) {
                throw new Error('--dir requires a path value');
            }
            dir = value;
        }
        else if (a === '--dry-run') { dryRun = true; }
        else if (a === '--yes' || a === '-y') { yes = true; }
        else if (!a.startsWith('-')) { components.push(a); }
    }

    return { command, components, dir, dryRun, yes };
}
