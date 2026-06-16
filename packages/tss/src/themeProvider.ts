// ─────────────────────────────────────────────────────
// ThemeProvider — imperative singleton for runtime theme switching
// ─────────────────────────────────────────────────────

import type { ThemeTokens } from './tokens.js';
import { defaultDark, defaultLight, detectDark } from './tokens.js';

/** Callback invoked when the active theme changes. */
export type ThemeChangeListener = (theme: ThemeTokens) => void;

/**
 * ThemeProvider — a global, imperative singleton that holds the currently
 * active {@link ThemeTokens} and notifies subscribers whenever it changes.
 *
 * Works entirely outside of JSX/React-style context. For component-level
 * theming in JSX trees use {@link AutoThemeProvider} + {@link useTheme}.
 *
 * @example
 * ```ts
 * import { ThemeProvider, draculaTheme } from '@termuijs/tss';
 *
 * // Read the current theme
 * const theme = ThemeProvider.getTheme();
 *
 * // Switch theme at runtime (notifies all subscribers)
 * ThemeProvider.setTheme(draculaTheme);
 *
 * // React to theme changes in a widget
 * const unsubscribe = ThemeProvider.subscribe((t) => {
 *   this.markDirty();
 * });
 *
 * // Clean up when the widget is destroyed
 * unsubscribe();
 * ```
 */
export const ThemeProvider = (() => {
    let current: ThemeTokens = detectDark() ? defaultDark : defaultLight;
    const listeners = new Set<ThemeChangeListener>();

    return {
        /**
         * Returns the currently active theme.
         */
        getTheme(): ThemeTokens {
            return current;
        },

        /**
         * Switches the active theme and notifies all subscribers synchronously.
         *
         * @param theme - The new {@link ThemeTokens} to apply.
         */
        setTheme(theme: ThemeTokens): void {
            current = theme;
            for (const listener of listeners) {
                listener(current);
            }
        },

        /**
         * Registers a callback that is called whenever the active theme changes.
         * Returns an unsubscribe function that removes the callback.
         *
         * @param listener - Callback receiving the new {@link ThemeTokens}.
         * @returns A function that removes the subscription.
         *
         * @example
         * ```ts
         * const unsub = ThemeProvider.subscribe((theme) => {
         *   this.markDirty();
         * });
         * // later:
         * unsub();
         * ```
         */
        subscribe(listener: ThemeChangeListener): () => void {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },

        /**
         * Returns the number of active subscribers.
         * Useful for testing and diagnostics.
         */
        listenerCount(): number {
            return listeners.size;
        },

        /**
         * Resets the active theme to the system default (dark or light based
         * on terminal detection). Does NOT notify subscribers.
         *
         * Primarily intended for use in tests.
         */
        reset(): void {
            current = detectDark() ? defaultDark : defaultLight;
        },
    };
})();

/** Convenience re-export of the two built-in token sets for easy import. */
export { defaultDark, defaultLight };
