#!/usr/bin/env node
// ─────────────────────────────────────────────────────
// Compare two render-loop bench outputs and post a markdown
// summary. Exits with code 1 when any size regresses by the
// configured threshold.
// ─────────────────────────────────────────────────────
//
// Usage: node scripts/compare-bench.mjs <head.json> <main.json> [--threshold 0.20]

import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: compare-bench.mjs <head.json> <main.json> [--threshold N]');
    process.exit(2);
}

const [headPath, mainPath] = args;
const thresholdIdx = args.indexOf('--threshold');
const threshold = thresholdIdx >= 0 ? parseFloat(args[thresholdIdx + 1]) : 0.20;

if (Number.isNaN(threshold) || !Number.isFinite(threshold) || threshold < 0) {
    console.error('Threshold must be a non-negative number');
    process.exit(2);
}

const head = JSON.parse(readFileSync(headPath, 'utf8'));
const main = JSON.parse(readFileSync(mainPath, 'utf8'));

const byKey = (r) => `${r.cols}x${r.rows}`;
const mainBySize = new Map(main.results.map((r) => [byKey(r), r]));
const headSizes = new Set(head.results.map(byKey));

let regressed = false;
const rows = [];
rows.push('| Size | main | this PR | Δ |');
rows.push('|------|------|---------|---|');
for (const r of head.results) {
    const k = byKey(r);
    const m = mainBySize.get(k);
    if (!m) {
        rows.push(`| ${k} | _missing_ | ${(r.cellsPerSec / 1e6).toFixed(2)}M | — |`);
        continue;
    }
    const delta = (r.cellsPerSec - m.cellsPerSec) / m.cellsPerSec;
    const sign = delta >= 0 ? '+' : '';
    const deltaStr = `${sign}${(delta * 100).toFixed(1)}%`;
    const flag = delta <= -threshold ? ' ❌' : delta >= threshold ? ' ⚡' : '';
    if (delta <= -threshold) regressed = true;
    rows.push(`| ${k} | ${(m.cellsPerSec / 1e6).toFixed(2)}M | ${(r.cellsPerSec / 1e6).toFixed(2)}M | ${deltaStr}${flag} |`);
}
for (const r of main.results) {
    const k = byKey(r);

    if (!headSizes.has(k)) {
        rows.push(
            `| ${k} | ${(r.cellsPerSec / 1e6).toFixed(2)}M | _missing_ | ❌ Removed |`
        );

        regressed = true;
    }
}
const markdown = [
    '<!-- termui-bench-comment -->',
    '## Render-loop benchmark',
    '',
    `Threshold: ≥${(threshold * 100).toFixed(0)}% regression on any size fails CI.`,
    '',
    ...rows,
    '',
    `Bun ${head.bun ?? 'n/a'} · Node ${head.node} · ${head.runMs}ms per size (after warm-up)`,
].join('\n');

const outPath = process.env.BENCH_COMMENT_OUT ?? 'bench-comment.md';
writeFileSync(outPath, markdown + '\n', 'utf8');
console.log(markdown);

if (regressed) {
    console.error(`\nRegression detected (>= ${(threshold * 100).toFixed(0)}%).`);
    process.exit(1);
}
