import { createContext, useContext, useState, useEffect } from '@termuijs/jsx';
import type { FC, VNode } from '@termuijs/jsx';
import { ansi, caps, parseColor, relativeLuminance } from '@termuijs/core';
import { detectDark, defaultDark, defaultLight, systemTheme } from './tokens.js';
import type { ThemeTokens } from './tokens.js';
import { deriveTheme } from './theme/derive.js';

/**
 * Context holding the current ThemeTokens.
 * Default value is systemTheme (detected at module load).
 */
export const ThemeContext = createContext(
    deriveTheme({ Normal: { fg: systemTheme.fg, bg: systemTheme.bg } })
);

export interface AutoThemeProviderProps {
    /** Theme to use in dark mode (default: defaultDark) */
    darkTheme?: ThemeTokens;
    /** Theme to use in light mode (default: defaultLight) */
    lightTheme?: ThemeTokens;
    children?: VNode | VNode[];
}

function rgbComponentFrom4Hex(value: string): number {
    return Math.round(parseInt(value, 16) / 257);
}

function parseOscColorResponse(data: string, code: 10 | 11): string | undefined {
    const regex = new RegExp(`\x1b\]${code};(?:#([0-9A-Fa-f]{6})|rgb:([0-9A-Fa-f]{4})\/([0-9A-Fa-f]{4})\/([0-9A-Fa-f]{4}))(?:\x07|\x1b\\)`);
    const match = regex.exec(data);
    if (!match) return undefined;

    if (match[1]) {
        return `#${match[1].toLowerCase()}`;
    }

    if (match[2] && match[3] && match[4]) {
        const r = rgbComponentFrom4Hex(match[2]);
        const g = rgbComponentFrom4Hex(match[3]);
        const b = rgbComponentFrom4Hex(match[4]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    return undefined;
}

async function queryOscColor(code: 10 | 11, timeoutMs = 120): Promise<string | undefined> {
    if (!process.stdin.isTTY || !process.stdout.isTTY) return undefined;
    if (typeof process.stdin.setRawMode !== 'function') return undefined;

    return new Promise((resolve) => {
        let buffer = '';
        const originalRaw = process.stdin.isRaw ?? false;
        const wasPaused = process.stdin.isPaused();
        let timer: NodeJS.Timeout;

        const cleanup = () => {
            clearTimeout(timer);
            process.stdin.off('data', onData);
            if (!originalRaw) {
                try {
                    process.stdin.setRawMode(false);
                } catch {
                    // ignore
                }
            }
            if (wasPaused) {
                process.stdin.pause();
            }
        };

        const onData = (chunk: Buffer | string) => {
            buffer += chunk.toString('utf8');
            const color = parseOscColorResponse(buffer, code);
            if (color) {
                cleanup();
                resolve(color);
            }
        };

        process.stdin.on('data', onData);
        if (wasPaused) {
            process.stdin.resume();
        }
        try {
            process.stdin.setRawMode(true);
        } catch {
            // ignore if raw mode cannot be enabled
        }

        process.stdout.write(`${ansi.OSC}${code};?`);
        timer = setTimeout(() => {
            cleanup();
            resolve(undefined);
        }, timeoutMs);
    });
}

async function detectDarkViaOsc(): Promise<boolean | undefined> {
    const bg = await queryOscColor(11);
    if (!bg) return undefined;

    const color = parseColor(bg);
    if (color.type === 'none') return undefined;

    return relativeLuminance(color) < 0.5;
}

/**
 * AutoThemeProvider — detects dark/light at mount and re-detects on SIGWINCH.
 * Provides the detected ThemeTokens via ThemeContext.
 *
 * ```tsx
 * <AutoThemeProvider darkTheme={draculaTheme} lightTheme={nordTheme}>
 *     <App />
 * </AutoThemeProvider>
 * ```
 */
export const AutoThemeProvider: FC<AutoThemeProviderProps> = (props) => {
    const dark = props.darkTheme ?? defaultDark;
    const light = props.lightTheme ?? defaultLight;

    const [theme, setTheme] = useState(() =>
        detectDark()
            ? deriveTheme({ Normal: { fg: dark.fg, bg: dark.bg } })
            : deriveTheme({ Normal: { fg: light.fg, bg: light.bg } })
    );

    useEffect(() => {
        const derivedDark = deriveTheme({ Normal: { fg: dark.fg, bg: dark.bg } });
        const derivedLight = deriveTheme({ Normal: { fg: light.fg, bg: light.bg } });

        let cancelled = false;

        const updateTheme = async () => {
            const oscDark = await detectDarkViaOsc();
            if (cancelled || oscDark === undefined) return;
            setTheme(oscDark ? derivedDark : derivedLight);
        };

        updateTheme();

        const handler = () => {
            setTheme(detectDark() ? derivedDark : derivedLight);
        };

        if (caps.color) {
            process.on('SIGWINCH', handler);
            return () => {
                cancelled = true;
                process.off('SIGWINCH', handler);
            };
        }

        // Without color support, skip SIGWINCH entirely
        return () => {
            cancelled = true;
        };
    }, [dark, light]);

    const childArray: VNode[] = Array.isArray(props.children)
        ? props.children
        : props.children != null
            ? [props.children]
            : [];

    // Return a VElement whose type is the Provider FC.
    // The reconciler will call Provider({ value: theme, children: childArray })
    // which stores the value on the fiber and transparently renders children.
    return {
        type: ThemeContext.Provider,
        props: { value: theme },
        children: childArray,
    } as any; // as any: reconciler VElement shape not assignable to VNode without cast
};

/**
 * useTheme — read the current ThemeTokens from the nearest AutoThemeProvider.
 * Falls back to systemTheme if no provider is present.
 */
export function useTheme(): ReturnType<typeof deriveTheme> {
    return useContext(ThemeContext);
}
