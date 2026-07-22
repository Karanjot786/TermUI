import type { ThemeTokens } from './tokens.js';

export type ThemeTokenName = keyof ThemeTokens;

export interface ThemeTokenCompileOptions {
    name: string;
    aliases?: Partial<Record<string, ThemeTokenName>>;
    allowExtraTokens?: boolean;
}

export interface CompiledThemeTokens {
    name: string;
    tokens: ThemeTokens;
    variables: Record<`--${ThemeTokenName}`, string>;
    tss: string;
}

export interface ThemeTokenDiagnostic {
    code: 'missing-token' | 'unknown-token' | 'invalid-alias';
    token: string;
    message: string;
}

const REQUIRED_TOKENS: ThemeTokenName[] = [
    'bg',
    'fg',
    'primary',
    'secondary',
    'success',
    'warning',
    'error',
    'muted',
    'border',
    'highlight',
];

export function validateThemeTokens(
    input: Record<string, string>,
    options: Pick<ThemeTokenCompileOptions, 'aliases' | 'allowExtraTokens'> = {},
): ThemeTokenDiagnostic[] {
    const diagnostics: ThemeTokenDiagnostic[] = [];
    const normalized = normalizeTokenKeys(input, options.aliases ?? {});

    for (const key of REQUIRED_TOKENS) {
        if (!normalized[key]) {
            diagnostics.push({
                code: 'missing-token',
                token: key,
                message: `Missing required theme token: ${key}`,
            });
        }
    }

    for (const key of Object.keys(input)) {
        const mapped = options.aliases?.[key] ?? key;
        if (!REQUIRED_TOKENS.includes(mapped as ThemeTokenName)) {
            diagnostics.push({
                code: 'unknown-token',
                token: key,
                message: `Unknown theme token: ${key}`,
            });
        }
    }

    for (const [alias, target] of Object.entries(options.aliases ?? {})) {
        if (!REQUIRED_TOKENS.includes(target)) {
            diagnostics.push({
                code: 'invalid-alias',
                token: alias,
                message: `Alias ${alias} points to an unknown token: ${target}`,
            });
        }
    }

    return options.allowExtraTokens
        ? diagnostics.filter(diagnostic => diagnostic.code !== 'unknown-token')
        : diagnostics;
}

export function compileThemeTokens(
    input: Record<string, string>,
    options: ThemeTokenCompileOptions,
): CompiledThemeTokens {
    const diagnostics = validateThemeTokens(input, options);
    if (diagnostics.length > 0) {
        throw new Error(diagnostics.map(diagnostic => diagnostic.message).join('\n'));
    }

    const tokens = normalizeTokenKeys(input, options.aliases ?? {}) as ThemeTokens;
    const variables = Object.fromEntries(
        REQUIRED_TOKENS.map(token => [`--${token}`, tokens[token]]),
    ) as Record<`--${ThemeTokenName}`, string>;
    const tss = `@theme ${options.name} {\n` +
        REQUIRED_TOKENS.map(token => `  --${token}: ${tokens[token]};`).join('\n') +
        '\n}';

    return {
        name: options.name,
        tokens,
        variables,
        tss,
    };
}

function normalizeTokenKeys(
    input: Record<string, string>,
    aliases: Partial<Record<string, ThemeTokenName>>,
): Partial<ThemeTokens> {
    const output: Partial<ThemeTokens> = {};
    for (const [key, value] of Object.entries(input)) {
        const mapped = aliases[key] ?? key;
        if (REQUIRED_TOKENS.includes(mapped as ThemeTokenName)) {
            output[mapped as ThemeTokenName] = value;
        }
    }
    return output;
}
