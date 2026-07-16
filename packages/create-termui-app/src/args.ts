export interface CliArgs {
    name?: string;
    template?: string;
    theme?: string;
    yes: boolean;
    version?: boolean;
    dir?: string;

    command?: string;
    component?: string;
    dryRun?: boolean;
}

export const TEMPLATE_KEYS = [
    "empty",
    "dashboard",
    "interactive-tool",
    "cli-wrapper",
    "cli-tool",
    "file-manager",
    "ai-assistant",
    "form-wizard",
] as const;

function getValue(
    argv: string[],
    key: string
): string | undefined {
    const index = argv.findIndex(a => a === key || a.startsWith(`${key}=`));

    if (index === -1) return undefined;

    const value = argv[index];

    if (value.includes("=")) {
        const inlineValue = value.split("=")[1];
        if (!inlineValue || inlineValue.startsWith("-")) {
            throw new Error(`${key} requires a value`);
        }
        return inlineValue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("-")) {
        throw new Error(`${key} requires a value`);
    }
    return next;
}

function getFirstPositional(argv: string[]): string | undefined {
    for (let index = 0; index < argv.length; index++) {
        const value = argv[index];

        if (value === "--template" || value === "--theme") {
            index++;
            continue;
        }

        if (value.startsWith("--template=") || value.startsWith("--theme=")) {
            continue;
        }

        if (!value.startsWith("-")) {
            return value;
        }
    }

    return undefined;
}

export function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        yes: false,
        dryRun: false,
    };
       
    if (argv.includes('--version') || argv.includes('-v')) {
        args.version = true;
        return args;
    }
    
    if (argv[0] === "add") {
        const positional: string[] = [];

        for (let index = 1; index < argv.length; index++) {
            const value = argv[index];

            if (value === "--dir") {
                index++;
                continue;
            }

            if (!value.startsWith("-")) {
                positional.push(value);
            }
        }

        args.command = "add";
        args.component = positional[0];
        args.dryRun = argv.includes("--dry-run");
        args.yes = argv.includes("--yes");

        const dirValue = getValue(argv, "--dir");
        if (dirValue) {
            args.dir = dirValue;
        }

        return args;
    }

    // positional (first non-flag)
    const positional = getFirstPositional(argv);
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

    if (args.yes) {
        args.name = args.name ?? "my-termui-app";
        args.template = args.template ?? "empty";
        args.theme = args.theme ?? "default";
    }

    return args;
}

export function isNonInteractive(args: CliArgs): boolean {
    return args.yes === true || (!!args.name && !!args.template && !!args.theme);
}
