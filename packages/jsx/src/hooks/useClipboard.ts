// ─────────────────────────────────────────────────────
// @termuijs/jsx — useClipboard
//
// Hook that reads from and writes to the system clipboard
// and exposes a copied-state flag for feedback.
// ─────────────────────────────────────────────────────

import { useState, useRef, useEffect } from '../hooks.js';
import { writeClipboard, readClipboard } from '@termuijs/core';

export interface UseClipboardOptions {
    /** Timeout in milliseconds after which copied state is reset to false */
    resetMs?: number;
}

export interface UseClipboardResult {
    /** True if copy was recently called, resets to false after resetMs */
    copied: boolean;
    /** Copy string text to the system clipboard */
    copy: (text: string) => void;
    /** Read current text from the system clipboard */
    read: () => Promise<string>;
}

/**
 * useClipboard — interact with the system clipboard.
 */
export function useClipboard(opts?: UseClipboardOptions): UseClipboardResult {
    const [copied, setCopied] = useState(false);
    const resetMs = opts?.resetMs ?? 2000;
    const timeoutRef = useRef<any>(null);

    // Clear the timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const copy = (text: string) => {
        writeClipboard(text);
        setCopied(true);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setCopied(false);
            timeoutRef.current = null;
        }, resetMs);
    };

    const read = async () => {
        return await readClipboard();
    };

    return { copied, copy, read };
}
