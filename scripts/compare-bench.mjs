#!/usr/bin/env node
// ─────────────────────────────────────────────────────
// Compare two render-loop bench outputs and post a markdown
// summary. Exits with code 1 when any size regresses by the
// configured threshold.
// ─────────────────────────────────────────────────────
//
// Usage: node scripts/compare-bench.mjs <head.json> <main.json> [--threshold 0.20]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: compare-bench.mjs <head.json> <main.json> [--threshold N]');
    process.exit(2);
}

const [headPath, mainPath] = args;
const thresholdIdx = args.indexOf('--threshold');
const threshold = thresholdIdx >= 0 ? parseFloat(args[thresholdIdx + 1]) : 0.20;

if (
    Number.isNaN(threshold) ||
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 1
) {
    console.error('Threshold must be between 0 and 1');
    process.exit(2);
}
let head, main;

if (!existsSync(headPath)) {
    console.error(`Benchmark file not found: ${headPath}`);
    process.exit(2);
}

if (!existsSync(mainPath)) {
    console.error(`Benchmark file not found: ${mainPath}`);
    process.exit(2);
}

try {
    head = JSON.parse(readFileSync(headPath, 'utf8'));
    main = JSON.parse(readFileSync(mainPath, 'utf8'));
} catch (e) {
    console.error(`Error parsing benchmark files: ${e.message}`);
    const errMarkdown = `<!-- termui-bench-comment -->\n## Render-loop benchmark\n\n❌ **Error:** Failed to parse benchmark results. Check CI logs for details.`;
    const outPath = process.env.BENCH_COMMENT_OUT ?? 'bench-comment.md';
    writeFileSync(outPath, errMarkdown + '\n', 'utf8');
    process.exit(2);
}

function validateBench(data, name) {
    if (!data || typeof data !== 'object') {
        console.error(`${name}: invalid benchmark file`);
        process.exit(2);
    }

    if (!Array.isArray(data.results)) {
        console.error(`${name}: missing results array`);
        process.exit(2);
    }

    for (const [index, result] of data.results.entries()) {
        if (
            typeof result.cols !== 'number' ||
            !Number.isFinite(result.cols)
        ) {
            console.error(
                `${name}: result[${index}] has invalid cols value`
            );
            process.exit(2);
        }

        if (
            typeof result.rows !== 'number' ||
            !Number.isFinite(result.rows)
        ) {
            console.error(
                `${name}: result[${index}] has invalid rows value`
            );
            process.exit(2);
        }

        if (
            typeof result.cellsPerSec !== 'number' ||
            !Number.isFinite(result.cellsPerSec)
        ) {
            console.error(
                `${name}: result[${index}] has invalid cellsPerSec value`
            );
            process.exit(2);
        }
    }
}

validateBench(head, 'head benchmark');
validateBench(main, 'main benchmark');
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
