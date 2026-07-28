/**
 * Parsed command-line arguments for the `@termuijs/cli` binary.
 */
export interface CliArgs {
    /** Subcommand to run. Unknown/empty values default to `help`. */
    command: 'add' | 'list' | 'init' | 'help';
    /** Component names passed as positional arguments. */
    components: string[];
    /** Target directory for `--dir`. */
    dir?: string;
    /** When true, perform a dry run without writing changes. */
    dryRun: boolean;
    /** When true, skip interactive confirmation prompts. */
    yes: boolean;
}

/**
 * Parse a `process.argv`-style array (excluding the node/script entries) into a
 * {@link CliArgs} object. Supports `--dir <path>`, `--dry-run`, `--yes`/`-y`.
 *
 * @throws Error if `--dir` is not followed by a non-flag value.
 */
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
