export interface CliArgs {
    name?: string;
    template?: string;
    theme?: string;
    yes: boolean;
}

const TEMPLATE_KEYS = [
    "empty",
    "dashboard",
    "interactive-tool",
    "cli-wrapper",
    "cli-tool",
    "file-manager",
] as const;

function getValue(
    argv: string[],
    key: string
): string | undefined {
    const index = argv.findIndex(a => a === key || a.startsWith(`${key}=`));

    if (index === -1) return undefined;

    const value = argv[index];

    if (value.includes("=")) {
        return value.split("=")[1];
    }

    return argv[index + 1];
}

export function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        yes: false,
    };

    // positional (first non-flag)
    const positional = argv.find(a => !a.startsWith("-"));
    if (positional) {
        args.name = positional;
    }

    if (argv.includes("--yes")) {
        args.yes = true;
    }

    const template = getValue(argv, "--template");
    if (template) {
        if (!TEMPLATE_KEYS.includes(template as any)) {
            throw new Error(
                `Invalid template "${template}". Valid: ${TEMPLATE_KEYS.join(", ")}`
            );
        }
        args.template = template;
    }

    const theme = getValue(argv, "--theme");
    if (theme) {
        args.theme = theme;
    }

    return args;
}

export function isNonInteractive(args: CliArgs): boolean {
    return args.yes === true;
}