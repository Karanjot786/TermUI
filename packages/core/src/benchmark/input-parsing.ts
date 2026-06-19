// ─────────────────────────────────────────────────────
// @termuijs/core — Input parsing benchmark
// ─────────────────────────────────────────────────────
//
// Measures key lookup performance across different key types.
// Key parsing is a critical path as every keystroke must be parsed.
//
// Output:
//   - human-readable lines on stdout
//   - one JSON line prefixed with `BENCH_RESULT_JSON:` for CI parsing

import { ESCAPE_SEQUENCES, CTRL_KEYS, SPECIAL_KEYS } from '../input/KeyMap.js';
import { createKeyEvent } from '../events/types.js';

interface KeyTypeResult {
    keyType: string;
    lookupsPerSec: number;
    durationMs: number;
    iterations: number;
}

const KEY_TYPES = [
    { keyType: 'escape-sequences', sequences: Object.keys(ESCAPE_SEQUENCES) },
    { keyType: 'ctrl-keys', codes: Object.keys(CTRL_KEYS).map(Number) },
    { keyType: 'special-keys', codes: Object.keys(SPECIAL_KEYS).map(Number) },
];

const RUN_MS = 1000;

function benchEscapeSequences(sequences: string[]): KeyTypeResult {
    let iterations = 0;
    const start = performance.now();
    const deadline = start + RUN_MS;
    
    while (performance.now() < deadline) {
        for (const seq of sequences) {
            const keyName = ESCAPE_SEQUENCES[seq];
            if (keyName) {
                createKeyEvent({
                    key: keyName,
                    raw: Buffer.from(seq, 'utf8'),
                    ctrl: false,
                    alt: false,
                    shift: false,
                });
            }
        }
        iterations++;
    }
    
    const durationMs = performance.now() - start;
    const lookupsPerSec = (iterations * sequences.length) / (durationMs / 1000);
    
    return { keyType: 'escape-sequences', lookupsPerSec, durationMs, iterations };
}

function benchCtrlKeys(codes: number[]): KeyTypeResult {
    let iterations = 0;
    const start = performance.now();
    const deadline = start + RUN_MS;
    
    while (performance.now() < deadline) {
        for (const code of codes) {
            const keyName = CTRL_KEYS[code];
            if (keyName) {
                createKeyEvent({
                    key: keyName,
                    raw: Buffer.from([code]),
                    ctrl: code !== 0x09 && code !== 0x0D && code !== 0x0A,
                    alt: false,
                    shift: false,
                });
            }
        }
        iterations++;
    }
    
    const durationMs = performance.now() - start;
    const lookupsPerSec = (iterations * codes.length) / (durationMs / 1000);
    
    return { keyType: 'ctrl-keys', lookupsPerSec, durationMs, iterations };
}

function benchSpecialKeys(codes: number[]): KeyTypeResult {
    let iterations = 0;
    const start = performance.now();
    const deadline = start + RUN_MS;
    
    while (performance.now() < deadline) {
        for (const code of codes) {
            const keyName = SPECIAL_KEYS[code];
            if (keyName) {
                createKeyEvent({
                    key: keyName,
                    raw: Buffer.from([code]),
                    ctrl: false,
                    alt: false,
                    shift: false,
                });
            }
        }
        iterations++;
    }
    
    const durationMs = performance.now() - start;
    const lookupsPerSec = (iterations * codes.length) / (durationMs / 1000);
    
    return { keyType: 'special-keys', lookupsPerSec, durationMs, iterations };
}

function main(): void {
    const results: KeyTypeResult[] = [];
    
    for (const { keyType, sequences, codes } of KEY_TYPES) {
        let result: KeyTypeResult;
        if (keyType === 'escape-sequences' && sequences) {
            result = benchEscapeSequences(sequences);
        } else if (keyType === 'ctrl-keys' && codes) {
            result = benchCtrlKeys(codes);
        } else if (keyType === 'special-keys' && codes) {
            result = benchSpecialKeys(codes);
        } else {
            continue;
        }
        results.push(result);
        const lps = (result.lookupsPerSec / 1e6).toFixed(2);
        process.stdout.write(`${result.keyType}: ${lps}M lookups/sec  (${result.iterations} iterations in ${result.durationMs.toFixed(0)}ms)` + '\n');
    }
    
    const payload = {
        version: 1,
        benchmark: 'input-parsing',
        runMs: RUN_MS,
        node: process.versions.node,
        bun: process.versions.bun ?? null,
        results,
    };
    process.stdout.write(`BENCH_RESULT_JSON: ${JSON.stringify(payload)}` + '\n');
}

main();
