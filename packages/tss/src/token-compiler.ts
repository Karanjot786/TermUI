import type { ThemeTokens } from './tokens.js';

export type ThemeTokenName = keyof ThemeTokens;
export type ThemeTokenInput = ThemeTokens | Record<string, string | undefined>;

export interface ThemeTokenCompileOptions {
    name: string;
    aliases?: Partial<Record<string, string | undefined>>;
    allowExtraTokens?: boolean;
}

export interface CompiledThemeTokens {
    name: string;
    tokens: ThemeTokens;
    variables: Record<`--${ThemeTokenName}`, string>;
    tss: string;
}

export interface ThemeTokenDiagnostic {
    code: 'missing-token' | 'unknown-token' | 'invalid-alias' | 'circular-alias';
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

const REQUIRED_TOKEN_SET = new Set<string>(REQUIRED_TOKENS);

export function validateThemeTokens(
    input: ThemeTokenInput,
    options: Pick<ThemeTokenCompileOptions, 'aliases' | 'allowExtraTokens'> = {},
): ThemeTokenDiagnostic[] {
    const diagnostics: ThemeTokenDiagnostic[] = [];
    const aliases = options.aliases ?? {};
    const normalized = normalizeTokenKeys(input, aliases);

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
        const resolved = resolveTokenName(key, aliases);
        if (!resolved.token) {
            diagnostics.push({
                code: 'unknown-token',
                token: key,
                message: `Unknown theme token: ${key}`,
            });
        }
    }

    for (const alias of Object.keys(aliases)) {
        const resolved = resolveTokenName(alias, aliases);
        if (resolved.cycle) {
            diagnostics.push({
                code: 'circular-alias',
                token: alias,
                message: `Circular alias detected: ${resolved.cycle.join(' -> ')}`,
            });
            continue;
        }
        if (!resolved.token) {
            diagnostics.push({
                code: 'invalid-alias',
                token: alias,
                message: `Alias ${alias} points to an unknown token: ${resolved.invalidTarget}`,
            });
        }
    }

    return options.allowExtraTokens
        ? diagnostics.filter(diagnostic => diagnostic.code !== 'unknown-token')
        : diagnostics;
}

export function compileThemeTokens(
    input: ThemeTokenInput,
    options: ThemeTokenCompileOptions,
): CompiledThemeTokens {
    const diagnostics = validateThemeTokens(input, options);
    if (diagnostics.length > 0) {
        throw new Error(diagnostics.map(diagnostic => diagnostic.message).join('\n'));
    }

    const normalized = normalizeTokenKeys(input, options.aliases ?? {});
    const tokens: ThemeTokens = {
        bg: requireToken(normalized, 'bg'),
        fg: requireToken(normalized, 'fg'),
        primary: requireToken(normalized, 'primary'),
        secondary: requireToken(normalized, 'secondary'),
        success: requireToken(normalized, 'success'),
        warning: requireToken(normalized, 'warning'),
        error: requireToken(normalized, 'error'),
        muted: requireToken(normalized, 'muted'),
        border: requireToken(normalized, 'border'),
        highlight: requireToken(normalized, 'highlight'),
    };
    const variables: CompiledThemeTokens['variables'] = {
        '--bg': tokens.bg,
        '--fg': tokens.fg,
        '--primary': tokens.primary,
        '--secondary': tokens.secondary,
        '--success': tokens.success,
        '--warning': tokens.warning,
        '--error': tokens.error,
        '--muted': tokens.muted,
        '--border': tokens.border,
        '--highlight': tokens.highlight,
    };
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
    input: ThemeTokenInput,
    aliases: Partial<Record<string, string | undefined>>,
): Partial<ThemeTokens> {
    const output: Partial<ThemeTokens> = {};
    for (const [key, value] of Object.entries(input)) {
        if (value === undefined) continue;
        const mapped = resolveTokenName(key, aliases).token;
        if (mapped) {
            output[mapped] = value;
        }
    }
    return output;
}

function isThemeTokenName(value: string | undefined): value is ThemeTokenName {
    return typeof value === 'string' && REQUIRED_TOKEN_SET.has(value);
}

function resolveTokenName(
    name: string,
    aliases: Partial<Record<string, string | undefined>>,
    path: string[] = [],
): { token?: ThemeTokenName; invalidTarget?: string; cycle?: string[] } {
    if (path.includes(name)) {
        return { cycle: [...path.slice(path.indexOf(name)), name] };
    }

    const hasAlias = Object.prototype.hasOwnProperty.call(aliases, name);
    const target = hasAlias ? aliases[name] : name;
    if (isThemeTokenName(target)) {
        return { token: target };
    }
    if (!target || !Object.prototype.hasOwnProperty.call(aliases, target)) {
        return { invalidTarget: String(target) };
    }
    return resolveTokenName(target, aliases, [...path, name]);
}

function requireToken(tokens: Partial<ThemeTokens>, name: ThemeTokenName): string {
    const value = tokens[name];
    if (!value) {
        throw new Error(`Missing required theme token: ${name}`);
    }
    return value;
}
