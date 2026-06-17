// ─────────────────────────────────────────────────────
// @termuijs/core — Border merging benchmark
// ─────────────────────────────────────────────────────
//
// Measures border merging performance across different screen sizes.
// Border merging is a critical path during rendering as it processes
// the entire screen buffer to merge border characters.
//
// Output:
//   - human-readable lines on stdout
//   - one JSON line prefixed with `BENCH_RESULT_JSON:` for CI parsing

import { Screen } from '../terminal/Screen.js';
import { mergeBorders } from '../renderer/border-merge.js';
import { caps } from '../terminal/env-caps.js';

interface ScreenSizeResult {
    cols: number;
    rows: number;
    mergesPerSec: number;
    durationMs: number;
    iterations: number;
}

const SCREEN_SIZES = [
    { cols: 80, rows: 24 },
    { cols: 120, rows: 40 },
    { cols: 200, rows: 50 },
];

const RUN_MS = 1000;

function paintBorderGrid(screen: Screen): void {
    // Fill the screen with a grid of border characters to test merging
    for (let r = 0; r < screen.rows; r++) {
        for (let c = 0; c < screen.cols; c++) {
            let char = ' ';
            // Create a grid pattern with horizontal and vertical lines
            if (r % 4 === 0) {
                char = caps.unicode ? '─' : '-';
            } else if (c % 8 === 0) {
                char = caps.unicode ? '│' : '|';
            }
            screen.setCell(c, r, { char });
        }
    }
}

function benchScreenSize(cols: number, rows: number): ScreenSizeResult {
    const screen = new Screen(cols, rows);
    paintBorderGrid(screen);
    
    // Warm-up pass
    mergeBorders(screen);
    
    let iterations = 0;
    const start = performance.now();
    const deadline = start + RUN_MS;
    
    while (performance.now() < deadline) {
        paintBorderGrid(screen);
        mergeBorders(screen);
        iterations++;
    }
    
    const durationMs = performance.now() - start;
    const mergesPerSec = iterations / (durationMs / 1000);
    
    return { cols, rows, mergesPerSec, durationMs, iterations };
}

function main(): void {
    const results: ScreenSizeResult[] = [];
    
    for (const { cols, rows } of SCREEN_SIZES) {
        const result = benchScreenSize(cols, rows);
        results.push(result);
        const mps = result.mergesPerSec.toFixed(0);
        process.stdout.write(`${result.cols}x${result.rows}: ${mps} merges/sec  (${result.iterations} iterations in ${result.durationMs.toFixed(0)}ms)` + '\n');
    }
    
    const payload = {
        version: 1,
        benchmark: 'border-merge',
        runMs: RUN_MS,
        node: process.versions.node,
        bun: process.versions.bun ?? null,
        results,
    };
    process.stdout.write(`BENCH_RESULT_JSON: ${JSON.stringify(payload)}` + '\n');
}

main();
