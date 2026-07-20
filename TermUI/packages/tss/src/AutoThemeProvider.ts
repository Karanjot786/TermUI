import { createContext, useContext, useState, useEffect } from '@termuijs/jsx';
import type { FC, VNode } from '@termuijs/jsx';
import { caps } from '@termuijs/core';
import { detectDark, defaultDark, defaultLight, systemTheme } from './tokens.js';
import type { ThemeTokens } from './tokens.js';

/**
 * Context holding the current ThemeTokens.
 * Default value is systemTheme (detected at module load).
 */
export const ThemeContext = createContext<ThemeTokens>(systemTheme);

export interface AutoThemeProviderProps {
    /** Theme to use in dark mode (default: defaultDark) */
    darkTheme?: ThemeTokens;
    /** Theme to use in light mode (default: defaultLight) */
    lightTheme?: ThemeTokens;
    children?: VNode | VNode[];
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

    const [theme, setTheme] = useState<ThemeTokens>(() =>
        detectDark() ? dark : light
    );

    useEffect(() => {
        const handler = () => {
            setTheme(detectDark() ? dark : light);
        };
        if (caps.color) {
            process.on('SIGWINCH', handler);
            return () => {
                process.off('SIGWINCH', handler);
            };
        }
        // Without color support, skip SIGWINCH entirely
        return () => {};
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
    } as any;
};

/**
 * useTheme — read the current ThemeTokens from the nearest AutoThemeProvider.
 * Falls back to systemTheme if no provider is present.
 */
export function useTheme(): ThemeTokens {
    return useContext(ThemeContext);
}
