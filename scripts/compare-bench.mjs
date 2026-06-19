#!/usr/bin/env node
// ─────────────────────────────────────────────────────
// Compare two benchmark outputs and post a markdown summary.
// Exits with code 1 when any benchmark regresses by the configured threshold.
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
} catch (e) {
    console.error(`Error parsing HEAD benchmark file: ${e.message}`);
    const errMarkdown = `<!-- termui-bench-comment -->\n## Performance benchmarks\n\n❌ **Error:** Failed to parse HEAD benchmark results. Check CI logs for details.`;
    const outPath = process.env.BENCH_COMMENT_OUT ?? 'bench-comment.md';
    writeFileSync(outPath, errMarkdown + '\n', 'utf8');
    process.exit(2);
}

try {
    main = JSON.parse(readFileSync(mainPath, 'utf8'));
} catch (e) {
    console.warn(`Warning parsing baseline/main benchmark file: ${e.message}. Using HEAD as baseline.`);
    main = head;
}

// Handle both old format (single benchmark) and new format (aggregated benchmarks)
const isAggregatedHead = head.benchmarks !== undefined;
const isAggregatedMain = main.benchmarks !== undefined;
const headBenchmarks = isAggregatedHead ? head.benchmarks : [head];
const mainBenchmarks = isAggregatedMain ? main.benchmarks : [main];

// Detect format migration - if formats differ, this is a benchmark system upgrade
const isFormatMigration = isAggregatedHead !== isAggregatedMain;

if (isFormatMigration) {
    console.log('Benchmark format migration detected - skipping regression checks for this PR.');
    console.log(`HEAD format: ${isAggregatedHead ? 'aggregated' : 'single'}`);
    console.log(`Main format: ${isAggregatedMain ? 'aggregated' : 'single'}`);
    const markdown = [
        '<!-- termui-bench-comment -->',
        '## Performance benchmarks',
        '',
        'ℹ️ **Benchmark system upgrade** - This PR upgrades the benchmark infrastructure from single-benchmark to multi-benchmark format.',
        '',
        'Regression checks are skipped for this migration PR. Future PRs will compare against the new baseline.',
        '',
        `Bun ${head.bun ?? 'n/a'} · Node ${head.node}`,
    ].join('\n');
    const outPath = process.env.BENCH_COMMENT_OUT ?? 'bench-comment.md';
    writeFileSync(outPath, markdown + '\n', 'utf8');
    console.log(markdown);
    process.exit(0);
}

function validateBenchmark(data, name) {
    if (!data || typeof data !== 'object') {
        console.error(`${name}: invalid benchmark data`);
        process.exit(2);
    }

    if (!Array.isArray(data.results)) {
        console.error(`${name}: missing results array`);
        process.exit(2);
    }
}

// Validate all benchmarks
for (const bench of headBenchmarks) {
    validateBenchmark(bench, 'head benchmark');
}
for (const bench of mainBenchmarks) {
    validateBenchmark(bench, 'main benchmark');
}

// Create a map of benchmark name -> benchmark data for easy lookup
const mainByBench = new Map(mainBenchmarks.map((b) => [b.benchmark, b]));
const headBenchNames = new Set(headBenchmarks.map((b) => b.benchmark));
const mainBenchNames = new Set(mainBenchmarks.map((b) => b.benchmark));

let regressed = false;
const markdownSections = [];

markdownSections.push('<!-- termui-bench-comment -->');
markdownSections.push('## Performance benchmarks');
markdownSections.push('');
markdownSections.push(`Threshold: ≥${(threshold * 100).toFixed(0)}% regression on any metric fails CI.`);
markdownSections.push('');

// Process each benchmark
for (const headBench of headBenchmarks) {
    const benchName = headBench.benchmark;
    const mainBench = mainByBench.get(benchName);
    
    markdownSections.push(`### ${benchName}`);
    markdownSections.push('');
    
    if (!mainBench) {
        markdownSections.push(`⚠️ Benchmark not present in main branch - new benchmark (no regression check).`);
        markdownSections.push('');
        continue;
    }
    
    // Generate comparison table based on benchmark type
    const headResults = headBench.results;
    const mainResults = mainBench.results;
    
    // Guard against empty results arrays
    if (headResults.length === 0 || mainResults.length === 0) {
        markdownSections.push(`⚠️ Benchmark has no results - skipping comparison.`);
        markdownSections.push('');
        continue;
    }
    
    // Determine the key function based on result structure
    let keyFn, valueFn, unit;
    
    if (headResults[0].cols !== undefined && headResults[0].rows !== undefined) {
        // Render-loop or border-merge benchmark
        keyFn = (r) => `${r.cols}x${r.rows}`;
        valueFn = (r) => r.cellsPerSec ?? r.mergesPerSec;
        unit = 'cells/sec';
        markdownSections.push('| Size | main | this PR | Δ |');
        markdownSections.push('|------|------|---------|---|');
    } else if (headResults[0].nodeCount !== undefined) {
        // Layout computation benchmark
        keyFn = (r) => `${r.nodeCount} nodes`;
        valueFn = (r) => r.layoutsPerSec;
        unit = 'layouts/sec';
        markdownSections.push('| Tree size | main | this PR | Δ |');
        markdownSections.push('|-----------|------|---------|---|');
    } else if (headResults[0].propertyCount !== undefined) {
        // Style merge benchmark
        keyFn = (r) => `${r.propertyCount} props`;
        valueFn = (r) => r.mergesPerSec;
        unit = 'merges/sec';
        markdownSections.push('| Properties | main | this PR | Δ |');
        markdownSections.push('|------------|------|---------|---|');
    } else if (headResults[0].keyType !== undefined) {
        // Input parsing benchmark
        keyFn = (r) => r.keyType;
        valueFn = (r) => r.lookupsPerSec;
        unit = 'lookups/sec';
        markdownSections.push('| Key type | main | this PR | Δ |');
        markdownSections.push('|----------|------|---------|---|');
    } else {
        markdownSections.push(`⚠️ Unknown benchmark format for ${benchName}`);
        markdownSections.push('');
        continue;
    }
    
    const mainByKey = new Map(mainResults.map((r) => [keyFn(r), r]));
    const headKeys = new Set(headResults.map(keyFn));
    
    for (const headResult of headResults) {
        const k = keyFn(headResult);
        const m = mainByKey.get(k);
        
        if (!m) {
            const headValue = valueFn(headResult);
            const formattedValue = (headValue / 1e6).toFixed(2) + 'M';
            markdownSections.push(`| ${k} | _missing_ | ${formattedValue} | — |`);
            continue;
        }
        
        const headValue = valueFn(headResult);
        const mainValue = valueFn(m);
        const delta = (headValue - mainValue) / mainValue;
        const sign = delta >= 0 ? '+' : '';
        const deltaStr = `${sign}${(delta * 100).toFixed(1)}%`;
        const flag = delta <= -threshold ? ' ❌' : delta >= threshold ? ' ⚡' : '';
        
        if (delta <= -threshold) regressed = true;
        
        const formattedHead = (headValue / 1e6).toFixed(2) + 'M';
        const formattedMain = (mainValue / 1e6).toFixed(2) + 'M';
        markdownSections.push(`| ${k} | ${formattedMain} | ${formattedHead} | ${deltaStr}${flag} |`);
    }
    
    // Check for removed benchmarks
    for (const mainResult of mainResults) {
        const k = keyFn(mainResult);
        if (!headKeys.has(k)) {
            const mainValue = valueFn(mainResult);
            const formattedValue = (mainValue / 1e6).toFixed(2) + 'M';
            markdownSections.push(`| ${k} | ${formattedValue} | _missing_ | ❌ Removed |`);
            regressed = true;
        }
    }
    
    markdownSections.push('');
}

// Check for removed benchmarks
for (const benchName of mainBenchNames) {
    if (!headBenchNames.has(benchName)) {
        markdownSections.push(`### ${benchName}`);
        markdownSections.push('');
        markdownSections.push(`❌ Benchmark removed in this PR.`);
        markdownSections.push('');
        regressed = true;
    }
}

// Add footer
const nodeVersion = isAggregatedHead ? head.node : head.node;
const bunVersion = isAggregatedHead ? head.bun : head.bun;
markdownSections.push(`---`);
markdownSections.push(`Bun ${bunVersion ?? 'n/a'} · Node ${nodeVersion}`);

const markdown = markdownSections.join('\n');

const outPath = process.env.BENCH_COMMENT_OUT ?? 'bench-comment.md';
writeFileSync(outPath, markdown + '\n', 'utf8');
console.log(markdown);

if (regressed) {
    console.error(`\nRegression detected (>= ${(threshold * 100).toFixed(0)}%).`);
    process.exit(1);
}
