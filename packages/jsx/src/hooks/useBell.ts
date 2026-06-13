import { useCallback } from '../hooks.js';
import { bell } from '@termuijs/core';

/**
 * useBell - A React-like hook for triggering the terminal bell.
 *
 * Returns a stable function that, when called, will emit the BEL
 * control character to the terminal.
 *
 * ```tsx
 * const triggerBell = useBell();
 * 
 * useInput((key) => {
 *     if (key === 'b') triggerBell();
 * });
 * ```
 */
export function useBell(): () => void {
    return useCallback(() => {
        bell();
    }, []);
}
