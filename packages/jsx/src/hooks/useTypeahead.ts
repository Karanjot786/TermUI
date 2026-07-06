// ─────────────────────────────────────────────────────
// @termuijs/jsx — useTypeahead hook
// ─────────────────────────────────────────────────────
import { useState, useInput, useEffect, useRef } from '../hooks.js';
import { timerPoolSubscribe } from '@termuijs/motion';

/**
 * Accumulates printable character keypresses to navigate lists by typing.
 *
 * @param items List of options to search through.
 * @param getItemLabel Mapping function to retrieve a string label from each item.
 * @param delayMs Timeout in milliseconds before the search buffer resets (default: 500).
 * @returns The index of the first matched item, or -1 if no search has run or matches were found.
 */
export function useTypeahead<T>(
    items: T[],
    getItemLabel: (item: T) => string,
    delayMs = 500
): number {
    const [matchIndex, setMatchIndex] = useState(-1);
    const prefixRef = useRef('');
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (unsubscribeRef.current !== null) {
                unsubscribeRef.current();
            }
        };
    }, []);

    useInput((key, event) => {
        // Only handle printable characters: length 1, no ctrl/alt modifiers
        if (key.length !== 1 || event.ctrl || event.alt) return;

        // Reset previous timer
        if (unsubscribeRef.current !== null) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        const typedChar = key.toLowerCase();
        const proposedPrefix = prefixRef.current + typedChar;

        // Find the index of the first item whose label starts with the proposed prefix
        const foundIndex = items.findIndex((item) =>
            getItemLabel(item).toLowerCase().startsWith(proposedPrefix)
        );

        if (foundIndex !== -1) {
            prefixRef.current = proposedPrefix;
            setMatchIndex(foundIndex);
        } else if (prefixRef.current === '') {
            // No match at all even for the first character, do not match or update state.
        } else {
            // proposedPrefix has no match. Ignore the mismatching character,
            // but keep the previous valid matching prefix active.
        }

        // Reset search string after inactivity delayMs
        unsubscribeRef.current = timerPoolSubscribe(delayMs, () => {
            prefixRef.current = '';
            if (unsubscribeRef.current !== null) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        });
    });

    return matchIndex;
}
