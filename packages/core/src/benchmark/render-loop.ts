// ─────────────────────────────────────────────────────
// @termuijs/core — Render-loop benchmark
// ─────────────────────────────────────────────────────
//
// Measures differential render throughput in cells/sec across three
// representative screen sizes. Every iteration invalidates the entire
// back buffer so the renderer pays a worst-case full-redraw cost.
//
// Output:
//   - human-readable lines on stdout
//   - one JSON line prefixed with `BENCH_RESULT_JSON:` for CI parsing

import { Writable } from 'node:stream';
import { Terminal } from '../terminal/Terminal.js';
import { Screen } from '../terminal/Screen.js';
import { Renderer } from '../terminal/Renderer.js';

interface SizeResult {
    cols: number;
    rows: number;
    frames: number;
    cellsPerSec: number;
    durationMs: number;
}

const SIZES = [
    { cols: 80, rows: 24 },
    { cols: 120, rows: 40 },
    { cols: 200, rows: 50 },
];

const RUN_MS = 1000;

function makeNullStdout(): NodeJS.WriteStream {
    const sink = new Writable({ write(_chunk, _enc, cb) { cb(); } });
    // The Renderer only uses .write(); cast to satisfy NodeJS.WriteStream.
    return sink as unknown as NodeJS.WriteStream;
}

function paintBackBuffer(screen: Screen): void {
    // Fill the back buffer with a non-trivial pattern so each cell
    // change produces real diff/render work.
    for (let r = 0; r < screen.rows; r++) {
        for (let c = 0; c < screen.cols; c++) {
            const ch = String.fromCharCode(33 + ((r * 7 + c * 3) % 90));
            screen.setCell(c, r, { char: ch });
        }
    }
}

function benchSize(terminal: Terminal, cols: number, rows: number): SizeResult {
    const screen = new Screen(cols, rows);
    const renderer = new Renderer(terminal, screen);
    paintBackBuffer(screen);

    let frames = 0;
    const start = performance.now();
    const deadline = start + RUN_MS;
    while (performance.now() < deadline) {
        screen.invalidate();
        renderer.renderNow();
        frames++;
    }
    const durationMs = performance.now() - start;
    const cellsPerSec = (frames * cols * rows) / (durationMs / 1000);

    return { cols, rows, frames, cellsPerSec, durationMs };
}

function main(): void {
    const terminal = new Terminal({
        stdout: makeNullStdout(),
        colorDepth: 24,
    });

    const results: SizeResult[] = [];

    for (const { cols, rows } of SIZES) {
        // Warm-up pass — JIT primes, allocations stabilize.
        benchSize(terminal, cols, rows);
        const result = benchSize(terminal, cols, rows);
        results.push(result);
        const mcps = (result.cellsPerSec / 1e6).toFixed(2);
        process.stdout.write(`${cols}x${rows}: ${mcps}M cells/sec  (${result.frames} frames in ${result.durationMs.toFixed(0)}ms)` + '\n');
    }

    const payload = {
        benchmark: 'render-loop',
        version: 1,
        runMs: RUN_MS,
        node: process.versions.node,
        bun: process.versions.bun ?? null,
        results,
    };
    process.stdout.write(`BENCH_RESULT_JSON: ${JSON.stringify(payload)}` + '\n');
}

main();
