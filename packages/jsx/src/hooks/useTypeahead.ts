import { useState, useRef, useEffect, useInput } from '../index.js';
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
    delayMs: number = 500
): number {
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const bufferRef = useRef<string>('');
    const timerRef = useRef<(() => void) | null>(null);

    useInput((input: any, keyObj?: any) => {
        // Handle varying input signatures
        const keyStr = input?.key ?? (typeof input === 'string' ? input : '');
        const isCtrl = input?.ctrl ?? keyObj?.ctrl ?? false;
        const isAlt = input?.alt ?? keyObj?.alt ?? false;

        // 1. Character Filtering: Only single printable characters, no modifiers
        if (keyStr && keyStr.length === 1 && !isCtrl && !isAlt) {
            const nextBuffer = bufferRef.current + keyStr;
            const lowerNextBuffer = nextBuffer.toLowerCase();

            // 2. Prefix Matching: Case-insensitive
            const matchIndex = items.findIndex(item =>
                getItemLabel(item).toLowerCase().startsWith(lowerNextBuffer)
            );

            // 3. Invalid Suffix Protection: Only update if we found a valid match
            if (matchIndex !== -1) {
                bufferRef.current = nextBuffer;
                setSelectedIndex(matchIndex);
            }

            // 4. Resettable Delay: Clear old timer, start a new one
            if (timerRef.current) {
                timerRef.current(); // Unsubscribe previous
            }
            
            timerRef.current = timerPoolSubscribe(delayMs, () => {
                bufferRef.current = '';
            });
        }
    });

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                timerRef.current();
            }
        };
    }, []);

    return selectedIndex;
}