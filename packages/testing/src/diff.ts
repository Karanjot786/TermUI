// ─────────────────────────────────────────────────────
// @termuijs/testing — Snapshot Diff Reporter
// ─────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ANSI escape codes for diff highlighting
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

/**
 * Compute Longest Common Subsequence matrix
 */
function lcs(a: string, b: string): number[][] {
    const dp: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
        dp.push(new Array(b.length + 1).fill(0));
    }
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp;
}

/**
 * Generate a character-level diff string for a single line
 */
function diffLine(expected: string, actual: string): string {
    const dp = lcs(expected, actual);
    let i = expected.length;
    let j = actual.length;
    let result = '';

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && expected[i - 1] === actual[j - 1]) {
            result = expected[i - 1] + result;
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result = `${GREEN}[+${actual[j - 1]}+]${RESET}` + result;
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            result = `${RED}[-${expected[i - 1]}-]${RESET}` + result;
            i--;
        }
    }
    return result;
}

/**
 * Generates a readable character-level diff between two multi-line strings.
 */
export function diffSnapshots(expected: string, actual: string): string {
    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');

    const maxLines = Math.max(expectedLines.length, actualLines.length);
    const resultLines: string[] = [];

    for (let i = 0; i < maxLines; i++) {
        const eLine = expectedLines[i] ?? '';
        const aLine = actualLines[i] ?? '';

        if (eLine === aLine) {
            resultLines.push(eLine);
        } else {
            resultLines.push(diffLine(eLine, aLine));
        }
    }

    return resultLines.join('\n');
}

/**
 * Manages reading, writing, and comparing snapshot test files.
 */
export class SnapshotReporter {
    /**
     * Read snapshot content from disk.
     * Returns null if the file does not exist.
     */
    readSnapshot(path: string): string | null {
        try {
            return readFileSync(path, 'utf8');
        } catch {
            return null;
        }
    }

    /**
     * Write snapshot content to disk.
     */
    writeSnapshot(path: string, content: string): void {
        const dir = dirname(path);
        mkdirSync(dir, { recursive: true });
        writeFileSync(path, content, 'utf8');
    }

    /**
     * Compare two snapshot strings and produce a highlighted diff.
     */
    compare(expected: string, actual: string): string {
        return diffSnapshots(expected, actual);
    }
}
